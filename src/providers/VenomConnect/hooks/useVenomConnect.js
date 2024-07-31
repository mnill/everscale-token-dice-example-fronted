import {VenomProviderContext} from "../index";
import {useContext} from "react";

export function useVenomConnect() {
  const {isInitializing, isConnected, account, provider, login, logout} = useContext(VenomProviderContext);
  return {isInitializing, isConnected, account, provider, login, logout};
}
