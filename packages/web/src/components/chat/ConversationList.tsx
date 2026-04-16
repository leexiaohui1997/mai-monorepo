import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons'
import { Button, Modal, Input, Empty, Tooltip } from 'antd'
import { useState } from 'react'

import type { ConversationMeta } from '../../services/chatService'

const isTempId = (id: string) => id.startsWith('temp-')

interface Props {
  conversations: ConversationMeta[]
  currentId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
  onRename: (id: string, title: string) => void
}

/** 相对时间格式化 */
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  return `${days}天前`
}

/** 会话列表项 */
function ConversationItem({
  conv,
  isActive,
  onSelect,
  onDelete,
  onRename,
}: {
  conv: ConversationMeta
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
  onRename: (title: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(conv.title)

  const handleRename = () => {
    const trimmed = editTitle.trim()
    if (trimmed && trimmed !== conv.title) onRename(trimmed)
    setEditing(false)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除会话「${conv.title}」吗？`,
      onOk: onDelete,
    })
  }

  return (
    <div
      className={`group flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer hover:bg-gray-200 ${
        isActive ? 'bg-gray-200' : ''
      }`}
      onClick={onSelect}
      onDoubleClick={() => {
        if (!isTempId(conv.id)) setEditing(true)
      }}
    >
      <div className="flex-1 min-w-0">
        {editing ? (
          <Input
            size="small"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onPressEnter={handleRename}
            onBlur={handleRename}
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <>
            <div className="text-sm text-gray-800 truncate">{conv.title}</div>
            <div className="text-xs text-gray-400">{timeAgo(conv.updatedAt)}</div>
          </>
        )}
      </div>
      {!editing && !isTempId(conv.id) && (
        <div className="hidden group-hover:flex gap-1">
          <Tooltip title="重命名" mouseEnterDelay={1}>
            <EditOutlined
              className="text-gray-400 hover:text-gray-800 text-xs"
              onClick={(e) => {
                e.stopPropagation()
                setEditing(true)
              }}
            />
          </Tooltip>
          <Tooltip title="删除" mouseEnterDelay={1}>
            <DeleteOutlined
              className="text-xs"
              style={{ color: '#f87171' }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLElement).style.color = '#dc2626'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLElement).style.color = '#f87171'
              }}
              onClick={handleDelete}
            />
          </Tooltip>
        </div>
      )}
    </div>
  )
}

/** 会话列表面板 */
export const ConversationList: React.FC<Props> = ({
  conversations,
  currentId,
  onSelect,
  onNew,
  onDelete,
  onRename,
}) => {
  return (
    <div
      className="w-56 flex flex-col h-full border-r border-gray-200"
      style={{ background: '#f0f0f0' }}
    >
      <div className="p-3">
        <Button type="primary" icon={<PlusOutlined />} block onClick={onNew}>
          新建会话
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {conversations.length === 0 ? (
          <Empty description="暂无会话" image={Empty.PRESENTED_IMAGE_SIMPLE} className="mt-8" />
        ) : (
          conversations.map((conv) => (
            <ConversationItem
              key={conv.id}
              conv={conv}
              isActive={conv.id === currentId}
              onSelect={() => onSelect(conv.id)}
              onDelete={() => onDelete(conv.id)}
              onRename={(title) => onRename(conv.id, title)}
            />
          ))
        )}
      </div>
    </div>
  )
}
