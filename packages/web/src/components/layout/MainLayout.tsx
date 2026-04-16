import { Layout } from 'antd'

import { Sidebar } from './Sidebar'

const { Content } = Layout

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar />
      <Content style={{ padding: '24px', background: '#f5f5f5' }}>{children}</Content>
    </Layout>
  )
}
