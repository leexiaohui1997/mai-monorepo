import { SettingOutlined } from '@ant-design/icons'
import { Layout, Menu } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'

const { Sider } = Layout

export const Sidebar: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <Sider width={240} theme="dark">
      <div
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: 20,
          fontWeight: 'bold',
        }}
      >
        MAI
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        items={[
          {
            key: '/settings',
            icon: <SettingOutlined />,
            label: '供应商管理',
            onClick: () => navigate('/settings'),
          },
        ]}
      />
    </Sider>
  )
}
