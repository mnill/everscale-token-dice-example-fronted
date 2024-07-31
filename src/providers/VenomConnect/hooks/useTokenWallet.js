import {useCallback, useContext, useEffect, useState} from "react";
import {useTokenRootContract} from "./useTokenRoot";
import TokenWalletAbi from "../abi/TokenWallet.abi.json";
import BigNumber from "bignumber.js";
import {useVenomConnect} from "./useVenomConnect";

export function useTokenWallet(root_address, owner_address) {
  const {isConnected, provider, account} = useVenomConnect();
  const {isLoaded: isRootContractLoaded, contract: rootContract} = useTokenRootContract(root_address);

  const [contract, setContract] = useState(undefined);
  const [balance, setBalance] = useState(undefined);

  // Load address from the root contract and create tokenWallet contract
  useEffect( () => {
    let stale = false;
    if (isRootContractLoaded && owner_address && provider) {
      rootContract.methods.walletOf({
        answerId: 0,
        walletOwner: owner_address
      }).call({responsible: true}).then((answer) => {
        if (!stale) {
          setContract(new provider.Contract(TokenWalletAbi, answer.value0));
        }
      })
    }
    return () => {
      stale = true;
      setContract(undefined);
    }
  }, [isRootContractLoaded, provider, owner_address, rootContract]);

  // Update tokenWallet balance
  useEffect(() => {
    let stale = false;
    if (contract && provider) {
      function updateBalance() {
        contract.methods.balance({answerId: 0}).call({responsible: true}).then((answer) => {
          if (!stale) {
            setBalance(new BigNumber(answer.value0));
          }
        }).catch(function (err) {
          if (err.code === 2) {
            // TokenWallet for this user is not deployed yet
            setBalance(new BigNumber(0));
          }
        })
      }
      updateBalance();

      // Subscribe for all tokenWallet transactions to update the balance.
      const subscriber = new provider.Subscriber();
      subscriber.states(contract.address).on(function () {
          if (!stale) {
            updateBalance();
          }
      })

      return () => {
        stale = true;
        setBalance(undefined);
        subscriber.unsubscribe();
      }
    }
  }, [contract, provider])

  const transfer = useCallback(async (toOwner, amount_tokens, amount_venoms, notify, payload) => {
    if (contract && account.address) {
      // This method return Promise(tx)
      return contract.methods.transfer({
        amount: amount_tokens.toFixed(0, BigNumber.ROUND_DOWN),
        recipient: toOwner,
        deployWalletValue: '100000000', //0.1 venom
        remainingGasTo: owner_address,
        notify: notify,
        payload: payload
      }).send({
        amount: amount_venoms.toFixed(0, BigNumber.ROUND_DOWN),
        bounce: true,
        from: account.address
      })
    } else {
      return Promise.reject(new Error('Wallet contract is not initialized'));
    }
  }, [contract, account]);

  return {
    isLoaded: !!contract && balance !== undefined,
    balance: balance,
    transfer
  };
}
