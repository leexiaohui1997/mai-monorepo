import { Card, Button, Empty, message, Modal, Form, Input, Select, Switch } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useProviders } from '../services/useProviders';
import { providerService } from '../services/providerService';
import type { ProviderConfig, CreateProviderInput } from '../../../api/src/providers/types';
import { useState } from 'react';

export const SettingsPage: React.FC = () => {
  const { providers, refresh } = useProviders();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<ProviderConfig | null>(null);
  const [form] = Form.useForm();

  const handleAdd = () => {
    setEditingProvider(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (provider: ProviderConfig) => {
    setEditingProvider(provider);
    form.setFieldsValue(provider);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await providerService.delete(id);
      message.success('删除成功');
      refresh();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleTest = async () => {
    try {
      await form.validateFields();
      // 如果是新建，先临时保存以获取 ID，或者直接在本地测试（这里选择先调用后端接口）
      // 为了简化 MVP，我们假设用户必须先保存才能测试，或者我们在弹窗里增加一个“仅测试”逻辑
      // 考虑到用户体验，我们先检查是否有 ID
      if (!editingProvider) {
        message.warning('请先保存配置后再进行测试');
        return;
      }
      const res = await providerService.test(editingProvider.id);
      if (res.success) {
        message.success(res.message || '连接成功！');
      } else {
        message.error(res.message || '连接失败');
      }
    } catch (error: any) {
      message.error(error.message || '验证失败');
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editingProvider) {
        await providerService.update(editingProvider.id, values);
        message.success('更新成功');
      } else {
        await providerService.create(values as CreateProviderInput);
        message.success('创建成功');
      }
      setIsModalOpen(false);
      refresh();
    } catch (error) {
      message.error('操作失败');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>供应商配置</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>添加供应商</Button>
      </div>

      {providers.length === 0 ? (
        <Empty description="暂无供应商配置" />
      ) : (
        <Card.Grid style={{ width: '100%', padding: 16 }} hoverable>
          {providers.map(p => (
            <Card key={p.id} title={p.name} extra={
              <div>
                <EditOutlined style={{ marginRight: 8, cursor: 'pointer' }} onClick={() => handleEdit(p)} />
                <DeleteOutlined style={{ color: 'red', cursor: 'pointer' }} onClick={() => handleDelete(p.id)} />
              </div>
            } style={{ marginBottom: 16 }}>
              <p>类型: {p.type}</p>
              <p>模型: {p.model || '默认'}</p>
              <p>状态: <Switch checked={p.enabled} disabled /></p>
            </Card>
          ))}
        </Card.Grid>
      )}

      <Modal 
        title={editingProvider ? "编辑供应商" : "添加供应商"} 
        open={isModalOpen} 
        onCancel={() => setIsModalOpen(false)}
        footer={[
          editingProvider && (
            <Button key="test" icon={<ThunderboltOutlined />} onClick={handleTest}>
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
            <Select options={[
              { label: 'OpenAI (兼容 Ollama/Groq)', value: 'openai' },
              { label: 'Anthropic', value: 'anthropic' },
              { label: '自定义', value: 'custom' }
            ]} />
          </Form.Item>
          <Form.Item name="apiKey" label="API Key" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="baseURL" label="Base URL">
            <Input placeholder="仅自定义类型需要" />
          </Form.Item>
          <Form.Item name="model" label="默认模型">
            <Input placeholder="例如: gpt-4o" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
