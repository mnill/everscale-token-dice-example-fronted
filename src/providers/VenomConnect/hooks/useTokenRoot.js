import {useCallback, useContext, useEffect, useState} from "react";
import TokenRootAbi from "../abi/TokenRoot.abi.json";
import BigNumber from "bignumber.js";
import {useVenomConnect} from "./useVenomConnect";

export function useTokenRootContract(address) {
  const {isConnected, provider} = useVenomConnect();
  const [contract, setContract] = useState(undefined);

  useEffect(
    function () {
      if (isConnected && provider && address !== undefined) {
        setContract(new provider.Contract(TokenRootAbi, address));
      }
      return () => {
        setContract(undefined);
      };
    },
    [isConnected, provider,  address],
  );

  return {isLoaded: contract !== undefined, contract};
}

export function useTokenRoot(address) {
  const {isLoaded: isContractLoaded, contract} = useTokenRootContract(address);
  const [decimals, setDecimals] = useState(undefined);
  const [symbol, setSymbol] = useState(undefined);
  const [owner, setOwner] = useState(undefined);

  useEffect(function () {
    let stale = false;
    if (isContractLoaded) {
      contract.methods
        .decimals({answerId: 0})
        .call()
        .then(({value0: decimals}) => {
          if (!stale && !isNaN(parseInt(decimals))) {
            setDecimals(parseInt(decimals));
          }
        });
      contract.methods
        .symbol({answerId: 0})
        .call()
        .then(({value0: symbol}) => {
          !stale && setSymbol(symbol);
        });
      contract.methods
        .rootOwner({answerId: 0})
        .call()
        .then(({value0: owner}) => {
          !stale && setOwner(owner);
        });
    }
    return () => {
      stale = true;
      setDecimals(undefined);
      setSymbol(undefined);
      setOwner(undefined);
    }
  }, [isContractLoaded, contract])

  const mint = useCallback(async function (senderAddress, to) {
    if (contract) {
      if (!senderAddress.equals(owner)) {
        throw new Error('You are not the TokenRoot owner!');
      } else {
        return contract.methods.mint({
          amount: new BigNumber(1).shiftedBy(decimals).toFixed(0),
          recipient: to,
          deployWalletValue: new BigNumber(0.1).shiftedBy(9).toFixed(0),
          remainingGasTo: senderAddress,
          notify: true,
          payload: ""
        }).send({
          amount: new BigNumber(2).shiftedBy(9).toFixed(0),
          bounce: true,
          from: senderAddress
        })
      }
    } else {
      throw new Error('Contract not initialized');
    }
  }, [contract, decimals, owner]);

  return {isLoaded: isContractLoaded && decimals !== undefined && symbol !== undefined, decimals, symbol, mint }
}
