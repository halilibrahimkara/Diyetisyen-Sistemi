import { useState } from 'react' // React'in state yönetimi için hook'u
import { useNavigate } from 'react-router-dom' // Sayfa yönlendirmesi için React Router hook'u
import { useAuth } from '../context/AuthContext' // Kimlik doğrulama fonksiyonlarına erişim için context hook'u
import { Layout, Card, Form, Input, Button, Typography, message } from 'antd' // Ant Design UI bileşenleri

const { Title, Text } = Typography // Typography bileşenlerini ayıklama
const { Content } = Layout // Layout bileşeninden Content'i ayıklama

export default function Login() {
  const navigate = useNavigate() // Sayfa yönlendirmesi için hook
  const { login } = useAuth() // Context'ten login fonksiyonunu alma
  const [loading, setLoading] = useState(false) // Yükleme durumunu takip etmek için state
  const [form] = Form.useForm() // Form kontrolü için Ant Design hook'u

  // Form gönderildiğinde çalışacak fonksiyon - kimlik doğrulama işlemi
  const onFinish = async (values) => {
    try {
      setLoading(true) // Yükleme durumunu aktif et
      await login(values.email, values.password) // AuthContext'teki login fonksiyonunu çağır
      navigate('/dashboard') // Başarılı girişte dashboard sayfasına yönlendir
    } catch (error) {
      message.error('Giriş başarısız. Lütfen bilgilerinizi kontrol edin.') // Hata mesajı göster
    } finally {
      setLoading(false) // İşlem tamamlandığında yükleme durumunu kapat
    }
  }

  return (
    // Ana sayfa düzeni - tam ekran yüksekliğinde arka plan
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      {/* Ortalanmış içerik alanı */}
      <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          {/* Başlık ve alt metin bölümü */}
          <div style={{ textAlign: 'center', marginBottom: 30 }}>
            <Title level={2} style={{ color: '#1890ff', marginBottom: 8 }}>Diyetisyen Sistemi</Title>
            <Text type="secondary">Sağlıklı bir yaşam için kullanıcı girişi yapın</Text>
          </div>
          
          {/* Giriş formu kartı */}
          <Card style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: 'none' }}>
            {/* Ant Design Form bileşeni - giriş bilgilerini toplar */}
            <Form
              form={form}
              name="login"
              layout="vertical"
              onFinish={onFinish}
              initialValues={{ email: '', password: '' }} // Başlangıç değerleri
            >
              {/* E-posta giriş alanı - doğrulama kuralları ile */}
              <Form.Item 
                name="email" 
                label="E-posta"
                rules={[
                  { required: true, message: 'Lütfen e-posta adresinizi girin!' }, // Zorunlu alan kontrolü
                  { type: 'email', message: 'Geçerli bir e-posta adresi girin!' } // E-posta formatı kontrolü
                ]}
              >
                <Input placeholder="ornek@mail.com" size="large" />
              </Form.Item>

              {/* Şifre giriş alanı - gizleme özelliği ile */}
              <Form.Item 
                name="password" 
                label="Şifre"
                rules={[{ required: true, message: 'Lütfen şifrenizi girin!' }]} // Zorunlu alan kontrolü
              >
                <Input.Password placeholder="Şifreniz" size="large" />
              </Form.Item>

              {/* Giriş butonu */}
              <Form.Item style={{ marginTop: 24 }}>
                <Button 
                  type="primary" // Birincil renkte buton
                  htmlType="submit" // Form gönderme türü
                  size="large" // Büyük boyut
                  block // Tam genişlikte buton
                  loading={loading} // Yükleme durumuna göre görünüm
                >
                  Giriş Yap
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </div>
      </Content>
    </Layout>
  )
} 