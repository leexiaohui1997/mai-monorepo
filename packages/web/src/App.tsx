import { Spin } from 'antd'
import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import { MainLayout } from './components/layout/MainLayout'
import { SettingsPage } from './pages/Settings'
import { SetupPage } from './pages/Setup'
import { checkBun } from './services/envService'

/** 根路由守卫：检测 Bun 环境后决定跳转方向 */
function EnvGuard() {
  const [target, setTarget] = useState<string | null>(null)

  useEffect(() => {
    checkBun().then((result) => {
      setTarget(result.installed ? '/settings' : '/setup')
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
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<EnvGuard />} />
        <Route path="/setup" element={<SetupPage />} />
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
  )
}
