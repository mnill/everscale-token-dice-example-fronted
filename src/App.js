import './App.css';
import './loader.css';
import {
  TokenDiceContractAddress,
  TokenRootContractAddress
} from "./providers/VenomConnect";

import {Fragment, useEffect, useState} from "react";

import {useVenomConnect} from "./providers/VenomConnect/hooks/useVenomConnect";
import {useTokenWallet} from "./providers/VenomConnect/hooks/useTokenWallet";
import {useTokenRoot} from "./providers/VenomConnect/hooks/useTokenRoot";
import {useTokenDice} from "./providers/VenomConnect/hooks/useTokenDice";

import Dice from "./components/Dice";
import BigNumber from "bignumber.js";
import Message from "./components/Message";
import MintButton from "./components/MintButton";

function messageWithNonce(text) {
  return {
    text: text,
    nonce: Math.random()
  }
}

function App() {
  // Our the first tx in the transactions tree.
  const [firstTx, setFirstTx] = useState(undefined);

  // Last found game event, set to undefinied on each new playTx
  const [lastRollResult, setLastRollResult] = useState(undefined);

  // We tried to send a message but still has no firstTx
  const [sendingInProgress, setSendingInProgress] = useState(false);

  // selected "guess the number"
  const [selectedNumber, setSelectedNumber] = useState(1);
  const [bet, setBet] = useState(1);
  const [message, setMessage] = useState(messageWithNonce(''));

  const {isInitializing, account, provider, login, logout} = useVenomConnect();

  const {isLoaded: isRootContractLoaded, decimals, symbol, mint} = useTokenRoot(TokenRootContractAddress);
  const {isLoaded: isUserTokenWalletLoaded, balance: userTokenBalance, transfer: transferFromUser } = useTokenWallet(TokenRootContractAddress, account?.address);
  const {isLoaded: isTokenDiceLoaded, maxBet: maxBet, decodeEvents: decodeGameEvents } = useTokenDice();

  const isContractsLoaded = isRootContractLoaded && isUserTokenWalletLoaded && isTokenDiceLoaded;

  const play = async function () {
    const betWithDecimals = new BigNumber(bet).shiftedBy(decimals).integerValue(BigNumber.ROUND_DOWN);

    // Waiting for previous result
    if (sendingInProgress && lastRollResult === undefined) {
      return setMessage(messageWithNonce('Waiting for result...'));
    }

    if (betWithDecimals.isNaN()) {
      return setMessage(messageWithNonce(`Invalid amount of tokens`));
    }

    if (betWithDecimals.lte(0)) {
      return setMessage(messageWithNonce(`Bet must be gt then 0`));
    }

    if (userTokenBalance.lt(betWithDecimals)) {
      return setMessage(messageWithNonce( `Bet is too high, your token balance is only ${userTokenBalance.shiftedBy(-1 * decimals).toFixed(2, BigNumber.ROUND_DOWN)}`));
    }

    if (maxBet.lt(betWithDecimals)) {
      return setMessage(messageWithNonce(`Bet is too high, maximum bet is ${maxBet.shiftedBy(-1 * decimals).toFixed(2, BigNumber.ROUND_DOWN)}`))
    }

    setSendingInProgress(true);
    setMessage(messageWithNonce(''));
    setLastRollResult(undefined);

    const payload = (await provider.packIntoCell({
      data: {
        _bet_dice_value: (selectedNumber).toString(10),
      },
      structure: [
        {name: '_bet_dice_value', type: 'uint8'},
      ],
    })).boc;

    setMessage(messageWithNonce('Waiting for a transaction...'))
    transferFromUser(TokenDiceContractAddress, betWithDecimals, new BigNumber(1).shiftedBy(9), true, payload).then(function (tx) {
      setFirstTx(tx);
    }).catch((e) => {
      setSendingInProgress(false);
      if (e.code === 3) {
        setMessage(messageWithNonce(''));
        //Rejected by user
      } else {
        setMessage(messageWithNonce(e.message));
      }
      throw e;
    })
  }

  useEffect(function () {
    if (firstTx) {
      // We got new play Tx.
      // This is the first transaction in the chain, we are sending a message from our wallet
      // to the TokenWallet and asking him to transfer tokens to the TokenDice contracts.
      // This message are still in the way, but it is internal, so it will be finalized eventually,
      // it can be lost.
      // So we just need to wait until all transactions in the tree will finish.
      console.log('We have new firstTx, waiting for all transactions');
      setMessage(messageWithNonce('Your transaction already in the chain! Waiting for finalization.'))
      const subscriber = new provider.Subscriber();
      subscriber.trace(firstTx).filter(tx_in_tree => {
        return tx_in_tree.account.equals(TokenDiceContractAddress);
      }).first().then(async function (gameTx) {
        console.log('Play tx found!', gameTx);
        if (gameTx) {
          let events = await decodeGameEvents(gameTx);
          if (events.length !== 1 || events[0].event !== 'Game') {
            throw new Error('Something is wrong');
          }
          setLastRollResult(parseInt(events[0].data.result) + 1);
          setSendingInProgress(false);
          setFirstTx(undefined);
          if (events[0].data.result === events[0].data.bet) {
            setMessage(messageWithNonce(`You won ${new BigNumber(events[0].data.prize).shiftedBy(-1 * decimals).toFixed(2, BigNumber.ROUND_DOWN)} ${symbol}`));
          } else {
            setMessage(messageWithNonce('You lose'));
          }
        } else {
          // all transactions are finished, but there is no transactions is the chain on TokenDice
          //contract
          throw new Error('Something is wrong');
        }
      }).catch((err) => {
        setMessage(messageWithNonce(err.message));
        throw err;
      })
    }
  }, [provider, decimals, symbol, firstTx, decodeGameEvents])

  return (
    <div className="App App-fullscreen">
      {
        // Initialization
        isInitializing && <div className={'App-center-vertical-horizontal'}>
          <span className={'loader'}></span>
        </div>
      }
      {
        // Wallet not connected
        !isInitializing && !account && <div className={'App-center-vertical-horizontal'}>
                <span className={'button'} onClick={login}>
                  Connect Wallet
                </span>
        </div>
      }

      {
        !isInitializing && account && <Fragment>
          <div className={'header'}>
            <MintButton text={'Mint to user'} sender={account?.address} receiver={account?.address} mint={mint} onError={message => setMessage(messageWithNonce(message))}/>
            <MintButton text={'Mint to contract'} sender={account?.address} receiver={TokenDiceContractAddress} mint={mint} onError={message => setMessage(messageWithNonce(message))}/>
            <span className={'button'} onClick={logout}>
                  Disconnect
            </span>
          </div>
          <div className={'main-game'}>
            {
              isContractsLoaded
                ? <div>
                  <h2 className={'title'}>
                    Easy Dice Game
                  </h2>
                  <div style={{'margin': '0.83em'}}>
                    <Dice playInProgress={sendingInProgress} lastWonNumber={lastRollResult} />
                  </div>
                  <div className={'tokens-info'}>
                    <div className={'group'}>
                      <span className={'label'}>
                        your token balance:
                      </span>
                      <span className={'value'}>
                        {userTokenBalance.shiftedBy(-1 * decimals).toFixed(2, BigNumber.ROUND_DOWN)} {symbol}
                      </span>
                    </div>
                    <div className={'group'}>
                      <span className={'label'}>
                       max bet:
                      </span>
                        <span className={'value'}>
                        {maxBet.shiftedBy(-1 * decimals).toFixed(2, BigNumber.ROUND_DOWN)} {symbol}
                      </span>
                    </div>
                  </div>
                  <div className={'message-placeholder'}>
                    <Message message={message.text} nonce={message.nonce} />
                  </div>
                    <div className={'input-group'}>
                      <label>Guess the number</label>
                      {
                        [1,2,3,4,5,6].map((num) =>
                        <span key={num} className={`number ${num === selectedNumber ? 'selected' : ''}`} onClick={()=> setSelectedNumber(num)}>
                          {num}
                        </span>)
                      }
                    </div>
                    <div className={'input-group'}>
                      <label htmlFor="bet">Amount of tokens</label>
                      <input value={bet} id="bet" type="number" onChange={(e) => setBet(e.target.value)}/>
                    </div>
                    <span className={'button'} style={{background: 'blue'}} onClick={play}>
                      Play
                    </span>
                </div>
                : <div>
                  <div>
                    <h2 className={'title'}>
                      Loading contracts data
                    </h2>
                    <span className={'loader'}></span>
                  </div>
                </div>
            }
          </div>
        </Fragment>
      }
    </div>
  );
}

export default App;
