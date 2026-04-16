import { ConfigProvider, Spin } from 'antd'
import zhCN from 'antd/es/locale/zh_CN'
import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import { MainLayout } from './components/layout/MainLayout'
import { ChatPage } from './pages/Chat'
import { SettingsPage } from './pages/Settings'
import { SetupPage } from './pages/Setup'
import { checkBun } from './services/envService'

/** 根路由守卫：检测 Bun 环境后决定跳转方向 */
function EnvGuard() {
  const [target, setTarget] = useState<string | null>(null)

  useEffect(() => {
    checkBun().then((result) => {
      setTarget(result.installed ? '/chat' : '/setup')
    })
  }, [])

  if (!target) {
    return (
      <div
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}
      >
        <Spin size="large" />
      </div>
    )
  }
  return <Navigate to={target} replace />
}

export default function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<EnvGuard />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route
            path="/chat"
            element={
              <MainLayout>
                <ChatPage />
              </MainLayout>
            }
          />
          <Route
            path="/settings"
            element={
              <MainLayout>
                <SettingsPage />
              </MainLayout>
            }
          />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  )
}
