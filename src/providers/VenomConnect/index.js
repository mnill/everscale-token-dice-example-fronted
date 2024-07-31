import { Address, ProviderRpcClient } from "everscale-inpage-provider";
import { VenomConnect } from "venom-connect";

import React, {createContext, useCallback, useEffect, useState} from 'react';

export const targetNetworkId = 42;

export const TokenDiceContractAddress = new Address("0:84801efffcbb3557faf9bc066ae5100ac0b43fcff5b24eee958440bd637d7c85");
export const TokenRootContractAddress = new Address("0:78f89a0758f277c0670c985ecaeafe351a2dd08dc600b4708c8c3ae4dc2adc83");

const InitialState = {
    isInitializing: true,
    isConnected: false,
    account: undefined,
    provider: undefined,
    login: () => null,
    logout: () => null
}

async function initVenomConnect() {
    return new VenomConnect({
        theme: 'light', // dark
        checkNetworkId: targetNetworkId,
        providersOptions: {
            venomwallet: {
                links: {
                    // you can override links to the extensions/application there
                },
                walletWaysToConnect: [
                    {
                        // NPM package everscale inpage provider
                        package: ProviderRpcClient,
                        packageOptions: {
                            fallback:
                              VenomConnect.getPromise("venomwallet", "extension") || (() => Promise.reject()),
                            forceUseFallback: true,
                        },
                        // You can define fallback for standalone client,
                        // to be able to fetch data from BC withour connect a walelt.
                        // packageOptionsStandalone: {
                        //   // fallback: standaloneFallback,
                        //   // forceUseFallback: true,
                        // },

                        // Setup
                        id: "extension",
                        type: "extension",
                    },
                ],
                defaultWalletWaysToConnect: [
                    // List of enabled options
                    "mobile",
                    "ios",
                    "android",
                ],
            },
            // EverWallet
            everwallet: {
                links: {},
                walletWaysToConnect: [
                    {
                        // NPM package
                        package: ProviderRpcClient,
                        packageOptions: {
                            fallback:
                              VenomConnect.getPromise("everwallet", "extension") ||
                              (() => Promise.reject()),
                            forceUseFallback: true,
                        },
                        // packageOptionsStandalone: {
                        //   fallback: standaloneFallback,
                        //   forceUseFallback: true,
                        // },
                        id: "extension",
                        type: "extension",
                    },
                ],
                defaultWalletWaysToConnect: [
                    // List of enabled options
                    "mobile",
                    "ios",
                    "android",
                ],
            },
        },
    });
}
export const VenomProviderContext = createContext(InitialState);
export function VenomProvider({children}) {
    const [venomConnect, setVenomConnect] = useState(undefined);
    const [provider, setProvider] = useState(undefined);
    const [account, setAccount] = useState(undefined);
    const [selectedNetworkId, setSelectedNetworkId] = useState(1);
    const [isInitializing, setIsInitializing] = useState(true);

    // Initializing
    useEffect(() => {
        const initPipeline = async () => {
            // Check is we have provider
            const venomConnect = await initVenomConnect();
            setVenomConnect(venomConnect);

            const provider = await venomConnect.checkAuth();
            setProvider(provider);
            setIsInitializing(false);
        };

        initPipeline().catch((err) => {
            console.log(`Venom provider init error`, err);
        });
    }, []);

    useEffect(function () {
        // every time we got new provider
        venomConnect && venomConnect.on('connect', function (provider) {
            setProvider(provider);
        })
    }, [venomConnect]);

    // every time provider has changed
    useEffect(function () {
        // to gracefully unsubscribe
        let promises = [];
        let subscribers = [];
        let stale = false;

        if (provider) {
            // subscribe to permissions changed
            const permissionsSubscriberPromise = provider.subscribe('permissionsChanged');
            promises.push(permissionsSubscriberPromise);
            permissionsSubscriberPromise.then(function (permissionsSubscriber) {
                subscribers.push(permissionsSubscriber);
                permissionsSubscriber.on('data', (event) => {
                    if (!stale)
                        setAccount(event.permissions.accountInteraction);
                });
            })

            // subscribe to networkId changed
            const networkSubscriberPromise = provider.subscribe('networkChanged');
            promises.push(networkSubscriberPromise);
            networkSubscriberPromise.then(function(networkSubscriber) {
                subscribers.push(networkSubscriber);
                networkSubscriber.on('data', (event) => {
                    if (!stale)
                        setSelectedNetworkId(event.networkId);
                });
            })

            // after successfully subscribe to changes
            Promise.all(promises).then(function () {
                provider.getProviderState().then(function (currentProviderState) {
                    if (!stale) {
                        setSelectedNetworkId(currentProviderState.networkId);
                        setAccount(currentProviderState.permissions.accountInteraction);
                    }
                });
            });

            return () => {
                stale = true;
                Promise.all(promises).then(function () {
                    subscribers.forEach(function (subscribe) {
                        subscribe.unsubscribe();
                    });
                })
            }
        }
    }, [provider]);

    const login = useCallback(async () => {
        try {
           await venomConnect.connect();
        } catch (e) {
            console.log('Connecting error', e);
        }
    }, [venomConnect]);

    const logout = useCallback(async () => {
        await venomConnect.disconnect();
    }, [venomConnect]);

    return <VenomProviderContext.Provider value={{
        isInitializing,
        isConnected: !isInitializing && !!account && selectedNetworkId === targetNetworkId,
        account,
        provider,
        login,
        logout
    }}>
        {children}
    </VenomProviderContext.Provider>
}
