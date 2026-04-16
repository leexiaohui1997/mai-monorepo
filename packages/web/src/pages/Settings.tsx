import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  ThunderboltOutlined,
  LoadingOutlined,
  StarOutlined,
  StarFilled,
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
  Table,
} from 'antd'
import { useState } from 'react'

import { providerService } from '../services/providerService'
import { useProviders } from '../services/useProviders'

import type {
  ProviderConfig,
  ModelConfig,
  CreateProviderInput,
} from '../../../api/src/providers/types'

// --- 模型列表子组件 ---

const ModelList: React.FC<{ provider: ProviderConfig; onRefresh: () => void }> = ({
  provider,
  onRefresh,
}) => {
  const [adding, setAdding] = useState(false)
  const [editingModel, setEditingModel] = useState<ModelConfig | null>(null)
  const [testingModelId, setTestingModelId] = useState<string | null>(null)
  const [modelForm] = Form.useForm()

  const handleOpenAdd = () => {
    setEditingModel(null)
    modelForm.resetFields()
    setAdding(true)
  }

  const handleEditModel = (model: ModelConfig) => {
    setEditingModel(model)
    modelForm.setFieldsValue({ name: model.name, displayName: model.displayName })
    setAdding(true)
  }

  const handleSaveModel = async () => {
    const values = await modelForm.validateFields()
    if (editingModel) {
      await providerService.updateModel(provider.id, editingModel.id, values)
      message.success('模型更新成功')
    } else {
      await providerService.addModel(provider.id, values)
      message.success('模型添加成功')
    }
    modelForm.resetFields()
    setEditingModel(null)
    setAdding(false)
    onRefresh()
  }

  const handleDeleteModel = async (modelId: string) => {
    await providerService.deleteModel(provider.id, modelId)
    onRefresh()
    message.success('模型已删除')
  }

  const handleSetDefault = async (modelId: string) => {
    await providerService.setDefaultModel(provider.id, modelId)
    onRefresh()
    message.success('已设为默认模型')
  }

  const handleTestModel = async (modelId: string) => {
    setTestingModelId(modelId)
    try {
      const res = await providerService.test(provider.id, modelId)
      message[res.success ? 'success' : 'error'](
        res.message || (res.success ? '连接成功！' : '连接失败'),
      )
    } finally {
      setTestingModelId(null)
    }
  }

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <strong>模型列表</strong>
        <Button size="small" icon={<PlusOutlined />} onClick={handleOpenAdd}>
          添加
        </Button>
      </div>
      <Table
        dataSource={provider.models}
        rowKey="id"
        size="small"
        bordered
        pagination={false}
        locale={{
          emptyText: <Empty description="暂无模型" image={Empty.PRESENTED_IMAGE_SIMPLE} />,
        }}
        columns={[
          {
            title: '序号',
            width: 60,
            align: 'center' as const,
            render: (_: unknown, __: unknown, index: number) => index + 1,
          },
          {
            title: '模型名称',
            dataIndex: 'displayName',
            render: (_: unknown, record: ModelConfig) => (
              <span>
                {record.displayName || record.name}
                {record.isDefault && (
                  <Tag color="blue" style={{ marginLeft: 4 }}>
                    默认
                  </Tag>
                )}
              </span>
            ),
          },
          {
            title: '操作',
            width: 160,
            align: 'center' as const,
            render: (_: unknown, record: ModelConfig) => (
              <Space size="small">
                <Tooltip title="编辑模型" mouseEnterDelay={1}>
                  <EditOutlined
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleEditModel(record)}
                  />
                </Tooltip>
                <Tooltip title="测试连接" mouseEnterDelay={1}>
                  {testingModelId === record.id ? (
                    <LoadingOutlined style={{ color: '#faad14' }} />
                  ) : (
                    <ThunderboltOutlined
                      style={{ color: '#faad14', cursor: 'pointer' }}
                      onClick={() => handleTestModel(record.id)}
                    />
                  )}
                </Tooltip>
                {!record.isDefault && (
                  <Tooltip title="设为默认" mouseEnterDelay={1}>
                    <StarOutlined
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleSetDefault(record.id)}
                    />
                  </Tooltip>
                )}
                {record.isDefault && (
                  <Tooltip title="默认模型" mouseEnterDelay={1}>
                    <StarFilled style={{ color: '#1890ff' }} />
                  </Tooltip>
                )}
                <Tooltip title="删除模型" mouseEnterDelay={1}>
                  <DeleteOutlined
                    style={{ color: 'red', cursor: 'pointer' }}
                    onClick={() => handleDeleteModel(record.id)}
                  />
                </Tooltip>
              </Space>
            ),
          },
        ]}
      />
      <Modal
        title={editingModel ? '编辑模型' : '添加模型'}
        open={adding}
        onCancel={() => {
          setAdding(false)
          setEditingModel(null)
          modelForm.resetFields()
        }}
        onOk={handleSaveModel}
        destroyOnClose
      >
        <Form form={modelForm} layout="vertical">
          <Form.Item name="name" label="模型标识" rules={[{ required: true }]}>
            <Input placeholder="例如: gpt-4o" />
          </Form.Item>
          <Form.Item name="displayName" label="显示名称" rules={[{ required: true }]}>
            <Input placeholder="例如: GPT-4o" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

// --- 主页面 ---

export const SettingsPage: React.FC = () => {
  const { providers, refresh } = useProviders()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<ProviderConfig | null>(null)
  const [testing, setTesting] = useState(false)
  const [form] = Form.useForm()

  const handleAdd = () => {
    setEditingProvider(null)
    form.resetFields()
    setIsModalOpen(true)
  }

  const handleEdit = (provider: ProviderConfig) => {
    setEditingProvider(provider)
    form.setFieldsValue(provider)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await providerService.delete(id)
      message.success('删除成功')
      refresh()
    } catch {
      message.error('删除失败')
    }
  }

  const handleTest = async () => {
    try {
      await form.validateFields()
      if (!editingProvider) {
        message.warning('请先保存配置后再进行测试')
        return
      }
      setTesting(true)
      const res = await providerService.test(editingProvider.id)
      message[res.success ? 'success' : 'error'](
        res.message || (res.success ? '连接成功！' : '连接失败'),
      )
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '验证失败'
      message.error(msg)
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      if (editingProvider) {
        await providerService.update(editingProvider.id, values)
        message.success('更新成功')
      } else {
        await providerService.create(values as CreateProviderInput)
        message.success('创建成功')
      }
      setIsModalOpen(false)
      refresh()
    } catch {
      message.error('操作失败')
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>供应商配置</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          添加供应商
        </Button>
      </div>

      {providers.length === 0 ? (
        <Empty description="暂无供应商配置" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {providers.map((p) => (
            <Card
              key={p.id}
              title={p.name}
              extra={
                <Space size="small" align="center">
                  <Tooltip title="启用状态" mouseEnterDelay={1}>
                    <Switch
                      size="small"
                      checked={p.enabled}
                      onChange={async (checked) => {
                        await providerService.update(p.id, { enabled: checked })
                        refresh()
                      }}
                    />
                  </Tooltip>
                  <Tooltip title="编辑" mouseEnterDelay={1}>
                    <EditOutlined style={{ cursor: 'pointer' }} onClick={() => handleEdit(p)} />
                  </Tooltip>
                  <Tooltip title="删除" mouseEnterDelay={1}>
                    <DeleteOutlined
                      style={{ color: 'red', cursor: 'pointer' }}
                      onClick={() => handleDelete(p.id)}
                    />
                  </Tooltip>
                </Space>
              }
            >
              <p>类型: {p.type}</p>
              <p>
                模型:{' '}
                {p.models.length > 0
                  ? p.models.map((m) => (
                      <Tag key={m.id} color={m.isDefault ? 'blue' : 'default'}>
                        {m.displayName || m.name}
                      </Tag>
                    ))
                  : '未配置'}
              </p>

              <ModelList provider={p} onRefresh={refresh} />
            </Card>
          ))}
        </div>
      )}

      <Modal
        title={editingProvider ? '编辑供应商' : '添加供应商'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={[
          editingProvider && (
            <Button
              key="test"
              icon={<ThunderboltOutlined />}
              onClick={handleTest}
              loading={testing}
            >
              测试连接
            </Button>
          ),
          <Button key="cancel" onClick={() => setIsModalOpen(false)}>
            取消
          </Button>,
          <Button key="submit" type="primary" onClick={handleSave}>
            保存
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true }]}>
            <Select
              options={[
                { label: 'OpenAI (兼容 Ollama/Groq)', value: 'openai' },
                { label: 'Anthropic', value: 'anthropic' },
                { label: '自定义', value: 'custom' },
              ]}
            />
          </Form.Item>
          <Form.Item name="apiKey" label="API Key" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="baseURL" label="Base URL">
            <Input placeholder="仅自定义类型需要" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
