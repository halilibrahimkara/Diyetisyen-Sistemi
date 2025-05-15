// React gerekli hook'ları içe aktarma - durum ve bağlam yönetimi için
import { createContext, useContext, useState, useEffect } from 'react'
// React Router'dan useNavigate hook'unu içe aktarma - sayfa yönlendirmeleri için
import { useNavigate } from 'react-router-dom'
// Ant Design'dan message bileşenini içe aktarma - kullanıcı bildirimlerini göstermek için
import { message } from 'antd'

// Kimlik doğrulama bilgilerini tutacak context oluşturma
const AuthContext = createContext(null)

// AuthProvider bileşeni - kimlik doğrulama durumunu yönetir ve sağlar
export const AuthProvider = ({ children }) => {
  // Kullanıcı bilgilerini tutmak için state
  const [user, setUser] = useState(null)
  // Yükleme durumunu kontrol eden state
  const [loading, setLoading] = useState(true)
  // Seçili danışanı saklamak için state
  const [selectedConsultant, setSelectedConsultant] = useState(null)
  // Sayfa yönlendirmeleri için useNavigate hook'u
  const navigate = useNavigate()

  // Uygulama başladığında çalışacak effect - oturum durumunu kontrol eder
  useEffect(() => {
    // Sayfa yenilendiğinde localStorage'dan kullanıcı bilgilerini al
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
    
    // Sayfa yenilendiğinde localStorage'dan seçili danışan bilgilerini al
    const storedConsultant = localStorage.getItem('selectedConsultant')
    if (storedConsultant) {
      setSelectedConsultant(JSON.parse(storedConsultant))
    }
    
    setLoading(false)
  }, [])

  // Kullanıcı giriş işlemini yapan fonksiyon
  const login = async (email, password) => {
    try {
      // Sabit kullanıcı bilgileri ile giriş kontrolü
      if (email === 'halilkara1907@hotmail.com' && password === '123456') {
        // Giriş başarılı ise kullanıcı bilgilerini oluştur
        const mockUser = {
          id: 1,
          name: 'Halil Kara',
          email,
        }
        // Kullanıcı state'ini güncelleme
        setUser(mockUser)
        // Kullanıcı bilgilerini tarayıcı hafızasına kaydetme - oturum kalıcılığı için
        localStorage.setItem('user', JSON.stringify(mockUser))
        // Başarılı giriş bildirimi gösterme
        message.success('Giriş başarılı!')
        // Dashboard sayfasına yönlendirme
        navigate('/dashboard')
      } else {
        // Hatalı giriş bilgileri için hata fırlat
        throw new Error('Geçersiz e-posta veya şifre')
      }
    } catch (error) {
      // Hata durumunda bildirim gösterme
      message.error(error.message || 'Giriş başarısız!')
      throw error
    }
  }

  // Kullanıcı kaydı yapan fonksiyon
  const register = async (userData) => {
    try {
      // TODO: API entegrasyonu yapılacak
      // Şimdilik sahte kullanıcı bilgisi oluşturma
      const mockUser = {
        id: 1,
        name: userData.name,
        email: userData.email,
      }
      // Kullanıcı state'ini güncelleme
      setUser(mockUser)
      // Kullanıcı bilgilerini tarayıcı hafızasına kaydetme
      localStorage.setItem('user', JSON.stringify(mockUser))
      // Başarılı kayıt bildirimi gösterme
      message.success('Kayıt başarılı!')
      // Dashboard sayfasına yönlendirme
      navigate('/dashboard')
    } catch (error) {
      // Hata durumunda bildirim gösterme
      message.error('Kayıt başarısız!')
      throw error
    }
  }

  // Kullanıcı çıkış işlemini yapan fonksiyon
  const logout = () => {
    // Kullanıcı state'ini temizleme
    setUser(null)
    // Seçili danışan state'ini temizleme
    setSelectedConsultant(null)
    // localStorage'dan kullanıcı bilgilerini silme
    localStorage.removeItem('user')
    // localStorage'dan seçili danışan bilgilerini silme
    localStorage.removeItem('selectedConsultant')
    // Başarılı çıkış bildirimi gösterme
    message.success('Çıkış yapıldı!')
    // Giriş sayfasına yönlendirme
    navigate('/')
  }
  
  // Danışan seçme işlemini yapan fonksiyon
  const selectConsultant = (consultant) => {
    setSelectedConsultant(consultant)
    localStorage.setItem('selectedConsultant', JSON.stringify(consultant))
  }
  
  // Seçili danışanı temizleyen fonksiyon
  const clearSelectedConsultant = () => {
    setSelectedConsultant(null)
    localStorage.removeItem('selectedConsultant')
  }

  // Context değerini oluşturma - diğer bileşenlere sağlanacak veriler ve fonksiyonlar
  const value = {
    user,
    loading,
    selectedConsultant,
    login,
    register,
    logout,
    selectConsultant,
    clearSelectedConsultant
  }

  // AuthContext.Provider ile alt bileşenlere kimlik doğrulama durumunu sağlama
  return (
    <AuthContext.Provider value={value}>
      {/* Yükleme tamamlandığında alt bileşenleri render etme */}
      {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 