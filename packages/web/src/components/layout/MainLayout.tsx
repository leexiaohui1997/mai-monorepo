import { Layout } from 'antd'

import { Sidebar } from './Sidebar'

const { Content } = Layout

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <Layout style={{ height: '100vh' }}>
      <Sidebar />
      <Content style={{ background: '#fff', overflow: 'hidden' }}>{children}</Content>
    </Layout>
  )
}
