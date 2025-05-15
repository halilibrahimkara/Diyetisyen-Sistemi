import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider } from 'antd'
import trTR from 'antd/lib/locale/tr_TR'
import App from './App.jsx'

// Ant Design 5.x'de CSS import artık gerekli değil, theme provider ile stillemeler yapılıyor

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConfigProvider locale={trTR} theme={{ 
      token: {
        colorPrimary: '#1890ff',
        borderRadius: 6,
      }
    }}>
      <App />
    </ConfigProvider>
  </StrictMode>,
)
