import { CheckCircleOutlined, WarningOutlined } from '@ant-design/icons'
import { Button, Card, Spin, Tag, Tooltip, Typography } from 'antd'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import heroImg from '../assets/hero.png'
import { checkBun, installBun, onInstallLog, type EnvCheckResult } from '../services/envService'

type CheckStatus = 'checking' | 'installed' | 'not_installed'
type InstallStatus = 'idle' | 'installing' | 'success' | 'failed'

/** 顶部区域：Logo + 标题 */
function SetupHeader() {
  return (
    <div style={{ textAlign: 'center', marginBottom: 32 }}>
      <img src={heroImg} alt="MAI" style={{ width: 80, height: 80, marginBottom: 16 }} />
      <Typography.Title level={2} style={{ margin: 0 }}>
        MAI Desktop
      </Typography.Title>
      <Typography.Text type="secondary">环境准备</Typography.Text>
    </div>
  )
}

/** Bun 检测状态标签 */
function BunStatusTag({ status, version }: { status: CheckStatus; version: string | null }) {
  if (status === 'checking') {
    return <Spin size="small" />
  }
  if (status === 'installed') {
    return (
      <Tag color="success" icon={<CheckCircleOutlined />}>
        {version}
      </Tag>
    )
  }
  return (
    <Tag color="warning" icon={<WarningOutlined />}>
      未安装
    </Tag>
  )
}

/** 安装日志终端区域 */
function InstallLogPanel({ logs }: { logs: string[] }) {
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    logRef.current?.scrollTo(0, logRef.current.scrollHeight)
  }, [logs])

  if (logs.length === 0) return null

  return (
    <div
      ref={logRef}
      style={{
        marginTop: 12,
        padding: 12,
        background: '#1e1e1e',
        borderRadius: 6,
        maxHeight: 200,
        overflowY: 'auto',
        fontFamily: 'monospace',
        fontSize: 13,
        lineHeight: 1.6,
      }}
    >
      {logs.map((line, i) => (
        <div key={i} style={{ color: '#d4d4d4' }}>{`> ${line}`}</div>
      ))}
    </div>
  )
}

/** 安装失败后的操作区 */
function FailedActions({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      style={{
        marginTop: 8,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <Button onClick={onRetry}>重试</Button>
      <Typography.Link href="https://bun.sh" target="_blank">
        手动安装
      </Typography.Link>
    </div>
  )
}

export function SetupPage() {
  const navigate = useNavigate()
  const [checkStatus, setCheckStatus] = useState<CheckStatus>('checking')
  const [version, setVersion] = useState<string | null>(null)
  const [installStatus, setInstallStatus] = useState<InstallStatus>('idle')
  const [logs, setLogs] = useState<string[]>([])

  const runCheck = async () => {
    setCheckStatus('checking')
    const result: EnvCheckResult = await checkBun()
    setCheckStatus(result.installed ? 'installed' : 'not_installed')
    setVersion(result.version)
  }

  useEffect(() => {
    runCheck()
  }, [])

  const handleInstall = async () => {
    setInstallStatus('installing')
    setLogs([])
    const unlisten = await onInstallLog((line) => {
      setLogs((prev) => [...prev, line])
    })
    try {
      await installBun()
      setLogs((prev) => [...prev, '✅ Bun 安装成功'])
      setInstallStatus('success')
      await runCheck()
    } catch {
      setLogs((prev) => [...prev, '❌ 安装失败'])
      setInstallStatus('failed')
    } finally {
      unlisten()
    }
  }

  const handleRetry = () => {
    setInstallStatus('idle')
    setLogs([])
    handleInstall()
  }

  const isReady = checkStatus === 'installed'
  const showInstallBtn = checkStatus === 'not_installed' && installStatus === 'idle'

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#f5f5f5',
        padding: 24,
      }}
    >
      <SetupHeader />

      <Card style={{ width: '100%', maxWidth: 520 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <Typography.Text strong>Bun Runtime</Typography.Text>
            <br />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              API 服务运行时
            </Typography.Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BunStatusTag status={checkStatus} version={version} />
            {showInstallBtn && (
              <Button type="primary" size="small" onClick={handleInstall}>
                安装
              </Button>
            )}
            {installStatus === 'installing' && (
              <Button type="primary" size="small" loading disabled>
                安装中...
              </Button>
            )}
          </div>
        </div>

        <InstallLogPanel logs={logs} />
        {installStatus === 'failed' && <FailedActions onRetry={handleRetry} />}
      </Card>

      <div style={{ marginTop: 32 }}>
        <Tooltip title={isReady ? '' : '请先完成环境安装'}>
          <Button
            type="primary"
            size="large"
            disabled={!isReady}
            onClick={() => navigate('/settings')}
          >
            进入应用
          </Button>
        </Tooltip>
      </div>
    </div>
  )
}
