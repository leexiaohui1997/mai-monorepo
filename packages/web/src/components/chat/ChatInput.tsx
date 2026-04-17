import { SendOutlined } from '@ant-design/icons'
import { Input, Button, Select } from 'antd'
import { useState, useMemo } from 'react'

import { useModels } from '../../services/useModels'

interface Props {
  onSend: (content: string, model: { providerId: string; modelId: string }) => void
  isLoading: boolean
}

export const ChatInput: React.FC<Props> = ({ onSend, isLoading }) => {
  const [value, setValue] = useState('')
  const { models, defaultModelKey, loading: modelsLoading } = useModels()
  const [userSelectedKey, setUserSelectedKey] = useState<string>()
  const activeModelKey = useMemo(
    () => userSelectedKey ?? defaultModelKey,
    [userSelectedKey, defaultModelKey],
  )

  const handleSend = () => {
    const trimmed = value.trim()
    if (!trimmed || !activeModelKey) return
    const [providerId, modelId] = activeModelKey.split(':')
    onSend(trimmed, { providerId, modelId })
    setValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enter 发送，Shift+Enter 换行
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="border-t border-gray-200 p-4 flex flex-col gap-2">
      {/* 输入框独占一行 */}
      <Input.TextArea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
        autoSize={{ minRows: 3, maxRows: 6 }}
        disabled={isLoading}
      />
      {/* 控件行：左侧模型切换 + 右侧发送按钮 */}
      <div className="flex justify-between items-center">
        <Select
          value={activeModelKey}
          onChange={setUserSelectedKey}
          loading={modelsLoading}
          disabled={models.length === 0}
          placeholder={models.length === 0 ? '暂无可用模型' : '选择模型'}
          options={models.map((m) => ({
            value: m.key,
            label: m.displayName,
          }))}
          popupMatchSelectWidth={false}
          variant="borderless"
          size="small"
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSend}
          loading={isLoading}
          disabled={!value.trim() || !activeModelKey}
        />
      </div>
    </div>
  )
}
