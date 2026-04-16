import { SendOutlined } from '@ant-design/icons'
import { Input, Button } from 'antd'
import { useState } from 'react'

interface Props {
  onSend: (content: string) => void
  isLoading: boolean
}

export const ChatInput: React.FC<Props> = ({ onSend, isLoading }) => {
  const [value, setValue] = useState('')

  const handleSend = () => {
    const trimmed = value.trim()
    if (!trimmed) return
    onSend(trimmed)
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
    <div className="border-t border-gray-200 p-4 flex gap-2 items-end">
      <Input.TextArea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
        autoSize={{ minRows: 1, maxRows: 4 }}
        disabled={isLoading}
        className="flex-1"
      />
      <Button
        type="primary"
        icon={<SendOutlined />}
        onClick={handleSend}
        loading={isLoading}
        disabled={!value.trim()}
      />
    </div>
  )
}
