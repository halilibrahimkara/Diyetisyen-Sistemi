// React Router'dan Navigate bileşenini içe aktarma - yönlendirme işlemleri için
import { Navigate } from 'react-router-dom'
// Kimlik doğrulama context'inden useAuth hook'unu içe aktarma - kullanıcı durumunu kontrol etmek için
import { useAuth } from '../context/AuthContext'
// Ant Design bileşenlerini içe aktarma - yükleme göstergesi ve sayfa düzeni için
import { Spin, Layout } from 'antd'

// Korumalı rota bileşeni - giriş yapmış kullanıcılar dışında erişimi engellemek için kullanılır
export default function ProtectedRoute({ children }) {
  // useAuth hook'undan user ve loading durumlarını alma - kimlik doğrulama durumunu kontrol etmek için
  const { user, loading } = useAuth()

  // Eğer kimlik doğrulama bilgileri hala yükleniyorsa yükleme göstergesi göster
  if (loading) {
    return (
      // Tam ekran yükleme göstergesi için Layout bileşeni - ortada bir spinner göstermek için
      <Layout style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        {/* Dönen yükleme göstergesi - kullanıcıya işlem devam ediyor bilgisi vermek için */}
        <Spin size="large" />
      </Layout>
    )
  }

  // Eğer kullanıcı giriş yapmamışsa login sayfasına yönlendir - yetkisiz erişimi engeller
  if (!user) {
    // Navigate bileşeni ile kök URL'e (login sayfası) yönlendirme yapılır
    // replace özelliği tarayıcı geçmişini değiştirir, böylece geri tuşu önceki sayfaya dönmez
    return <Navigate to="/" replace />
  }

  // Kullanıcı giriş yapmışsa çocuk bileşenleri göster - koruma altındaki içeriği render eder
  return children
} 