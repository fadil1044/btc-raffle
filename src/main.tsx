import React from 'react'
import ReactDOM from 'react-dom/client'
import { WalletConnectProvider } from '@btc-vision/walletconnect'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WalletConnectProvider
      theme="dark"
      recommendedWallet="OP_WALLET"
      supportedWallets={['OP_WALLET']}
    >
      <App />
    </WalletConnectProvider>
  </React.StrictMode>,
)
