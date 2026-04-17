import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  ThunderboltOutlined,
  LoadingOutlined,
} from '@ant-design/icons'
import {
  Card,
  Button,
  Empty,
  message,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Tag,
  Space,
  Tooltip,
} from 'antd'
import { useState } from 'react'

import { searchProviderService } from '../services/searchProviderService'
import { useSearchProviders } from '../services/useSearchProviders'

import type { SearchProviderConfig, SearchProviderType } from '../../../api/src/search/types'

/** 渠道默认配置 */
const CHANNEL_DEFAULTS: Record<SearchProviderType, { name: string; baseURL: string }> = {
  tavily: { name: 'Tavily', baseURL: 'https://api.tavily.com' },
  serper: { name: 'Serper', baseURL: 'https://google.serper.dev' },
}

/** 渠道 Tag 颜色 */
const TYPE_COLORS: Record<string, string> = {
  tavily: 'blue',
  serper: 'green',
}

// --- 搜索服务卡片 ---

const ProviderCard: React.FC<{
  provider: SearchProviderConfig
  onEdit: () => void
  onRefresh: () => void
}> = ({ provider, onEdit, onRefresh }) => {
  const [testing, setTesting] = useState(false)

  const handleToggle = async (enabled: boolean) => {
    await searchProviderService.update(provider.id, { enabled })
    onRefresh()
  }

  const handleDelete = async () => {
    await searchProviderService.delete(provider.id)
    message.success('删除成功')
    onRefresh()
  }

  const handleTest = async () => {
    setTesting(true)
    try {
      const res = await searchProviderService.test(provider.id)
      message[res.success ? 'success' : 'error'](res.message)
    } finally {
      setTesting(false)
    }
  }

  return (
    <Card
      title={provider.name}
      extra={
        <Space size="small" align="center">
          <Tag color={TYPE_COLORS[provider.type]}>{provider.type.toUpperCase()}</Tag>
          <Tooltip title="启用状态" mouseEnterDelay={1}>
            <Switch size="small" checked={provider.enabled} onChange={handleToggle} />
          </Tooltip>
          <Tooltip title="编辑" mouseEnterDelay={1}>
            <EditOutlined style={{ cursor: 'pointer' }} onClick={onEdit} />
          </Tooltip>
          <Tooltip title="测试连接" mouseEnterDelay={1}>
            {testing ? (
              <LoadingOutlined style={{ color: '#faad14' }} />
            ) : (
              <ThunderboltOutlined
                style={{ color: '#faad14', cursor: 'pointer' }}
                onClick={handleTest}
              />
            )}
          </Tooltip>
          <Tooltip title="删除" mouseEnterDelay={1}>
            <DeleteOutlined style={{ color: 'red', cursor: 'pointer' }} onClick={handleDelete} />
          </Tooltip>
        </Space>
      }
    >
      <p>Base URL: {provider.baseURL}</p>
    </Card>
  )
}

// --- 主页面 ---

export const SearchSettingsPage: React.FC = () => {
  const { providers, refresh } = useSearchProviders()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<SearchProviderConfig | null>(null)
  const [form] = Form.useForm()

  const handleAdd = () => {
    setEditingProvider(null)
    form.resetFields()
    setIsModalOpen(true)
  }

  const handleEdit = (provider: SearchProviderConfig) => {
    setEditingProvider(provider)
    form.setFieldsValue({ type: provider.type, apiKey: '' })
    setIsModalOpen(true)
  }

  const handleTypeChange = (type: SearchProviderType) => {
    const defaults = CHANNEL_DEFAULTS[type]
    form.setFieldsValue({ name: defaults.name })
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      if (editingProvider) {
        await searchProviderService.update(editingProvider.id, { apiKey: values.apiKey })
        message.success('更新成功')
      } else {
        await searchProviderService.create({ type: values.type, apiKey: values.apiKey })
        message.success('创建成功')
      }
      setIsModalOpen(false)
      refresh()
    } catch {
      message.error('操作失败')
    }
  }

  return (
    <div style={{ padding: 24, background: '#f5f5f5', minHeight: '100%' }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>搜索服务配置</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          添加搜索服务
        </Button>
      </div>

      {providers.length === 0 ? (
        <Empty description="暂无搜索服务配置，请添加 Tavily 或 Serper 的 API Key" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {providers.map((p) => (
            <ProviderCard
              key={p.id}
              provider={p}
              onEdit={() => handleEdit(p)}
              onRefresh={refresh}
            />
          ))}
        </div>
      )}

      <Modal
        title={editingProvider ? '编辑搜索服务' : '添加搜索服务'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleSave}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item name="type" label="渠道类型" rules={[{ required: true }]}>
            <Select
              disabled={!!editingProvider}
              onChange={handleTypeChange}
              options={[
                { label: 'Tavily（专为 AI Agent 设计）', value: 'tavily' },
                { label: 'Serper（基于 Google 搜索）', value: 'serper' },
              ]}
            />
          </Form.Item>
          <Form.Item name="apiKey" label="API Key" rules={[{ required: !editingProvider }]}>
            <Input.Password placeholder={editingProvider ? '留空则不修改' : '请输入 API Key'} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
