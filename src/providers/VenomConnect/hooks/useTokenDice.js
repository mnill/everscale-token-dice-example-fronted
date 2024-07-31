import {TokenDiceContractAddress} from "../index";
import {useCallback, useContext, useEffect, useState} from "react";
import TokenDiceAbi from "../abi/TokenDice.abi.json";
import BigNumber from "bignumber.js";
import {useVenomConnect} from "./useVenomConnect";

export function useTokenDice() {
  const {isConnected, provider} = useVenomConnect();
  const [contract, setContract] = useState(undefined);
  const [maxBet, setMaxBet] = useState(undefined);

  useEffect( () => {
    if (!provider)
      return;
    let stale = false;
    setContract(new provider.Contract(TokenDiceAbi, TokenDiceContractAddress))
    return () => {
      stale = true;
      setContract(undefined);
    }
  }, [isConnected, provider]);

  useEffect(() => {
    if (contract) {
      let stale = false;

      function updateMaxBet() {
        // For responsible view we use .call, but for simple view we use .
        contract.methods.maxBet().call().then((answer) => {
          if (!stale) {
            setMaxBet(new BigNumber(answer.value0));
          }
        });
      }
      updateMaxBet();

      const subscriber = new provider.Subscriber();
      subscriber.states(contract.address).on((state) => {
        if (!stale) {
          updateMaxBet();
        }
      });

      return () => {
        stale = true;
        setMaxBet(undefined);
        subscriber.unsubscribe();
      }
    }
  }, [provider, contract]);

  const decodeEvents = useCallback(async function (tx) {
    return await contract.decodeTransactionEvents({
      transaction: tx,
    })
  }, [contract]);

  return {
    isLoaded: !!contract && maxBet !== undefined,
    maxBet: maxBet,
    decodeEvents
  };
}
