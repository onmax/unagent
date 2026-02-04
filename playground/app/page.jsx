'use client'

import { useState } from 'react'

const defaultPayload = JSON.stringify({ email: 'demo@example.com' }, null, 2)

function formatJson(value) {
  try {
    return JSON.stringify(value, null, 2)
  }
  catch {
    return String(value ?? '')
  }
}

export default function PlaygroundPage() {
  const [logs, setLogs] = useState([])
  const [payload, setPayload] = useState(defaultPayload)
  const [runId, setRunId] = useState('')

  const pushLog = (entry) => {
    setLogs(prev => [entry, ...prev])
  }

  const updateLog = (id, patch) => {
    setLogs(prev => prev.map(item => (item.id === id ? { ...item, ...patch } : item)))
  }

  const call = async (endpoint, init) => {
    const id = Math.random().toString(36).slice(2)
    const time = new Date().toLocaleTimeString()
    pushLog({ id, time, endpoint, status: 'loading' })

    try {
      const start = Date.now()
      const res = await fetch(endpoint, init)
      const data = await res.json()
      const elapsed = Date.now() - start
      updateLog(id, { status: 'success', elapsed, data })
      return data
    }
    catch (error) {
      updateLog(id, { status: 'error', error: error?.message || String(error) })
      return null
    }
  }

  const callSandbox = endpoint => call(endpoint)

  const parsePayload = () => {
    if (!payload.trim())
      return {}
    try {
      return JSON.parse(payload)
    }
    catch (error) {
      pushLog({
        id: Math.random().toString(36).slice(2),
        time: new Date().toLocaleTimeString(),
        endpoint: 'payload',
        status: 'error',
        error: `Invalid JSON payload: ${error?.message || String(error)}`,
      })
      return null
    }
  }

  const workflowStart = async () => {
    const payloadValue = parsePayload()
    if (payloadValue === null)
      return
    const data = await call('/api/workflow/start', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ payload: payloadValue }),
    })
    if (data?.runId)
      setRunId(data.runId)
  }

  const workflowStatus = async () => {
    if (!runId) {
      pushLog({
        id: Math.random().toString(36).slice(2),
        time: new Date().toLocaleTimeString(),
        endpoint: 'runId',
        status: 'error',
        error: 'Missing runId for status request',
      })
      return
    }
    await call(`/api/workflow/status?runId=${encodeURIComponent(runId)}`)
  }

  const workflowStop = async () => {
    if (!runId) {
      pushLog({
        id: Math.random().toString(36).slice(2),
        time: new Date().toLocaleTimeString(),
        endpoint: 'runId',
        status: 'error',
        error: 'Missing runId for stop request',
      })
      return
    }
    await call('/api/workflow/stop', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ runId }),
    })
  }

  const workflowSupports = async () => {
    await call('/api/workflow/supports')
  }

  return (
    <main style={{ padding: '1rem' }}>
      <style jsx global>
        {`
        :root { --pico-font-size: 14px; }
        body { padding: 0; }
        .section { margin-bottom: 1.5rem; }
        .buttons { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.75rem; }
        .buttons button { margin: 0; }
        #logs { height: 50vh; overflow-y: auto; background: var(--pico-code-background-color); padding: 1rem; border-radius: var(--pico-border-radius); font-family: monospace; font-size: 12px; white-space: pre-wrap; word-break: break-word; }
        .log-entry { margin-bottom: 0.75rem; border-bottom: 1px solid var(--pico-muted-border-color); padding-bottom: 0.75rem; }
        .log-entry .time { color: var(--pico-muted-color); }
        .log-entry .endpoint { color: var(--pico-primary); font-weight: bold; }
        .log-entry .error { color: var(--pico-del-color); }
        .log-entry .success { color: var(--pico-ins-color); }
        textarea { font-family: monospace; font-size: 12px; }
      `}
      </style>

      <h1>Unagent Playground (Vercel)</h1>

      <section className="section">
        <h2>Sandbox</h2>
        <div className="buttons">
          <button onClick={() => callSandbox('/api/sandbox')}>sandbox</button>
          <button onClick={() => callSandbox('/api/sandbox-mkdir')}>mkdir</button>
          <button onClick={() => callSandbox('/api/sandbox-stream')}>stream</button>
          <button onClick={() => callSandbox('/api/sandbox-process')}>process</button>
          <button onClick={() => callSandbox('/api/sandbox-vercel')}>vercel-specific</button>
          <button className="secondary" onClick={() => setLogs([])}>clear</button>
        </div>
      </section>

      <section className="section">
        <h2>Workflow</h2>
        <label htmlFor="payload">Payload (JSON)</label>
        <textarea
          id="payload"
          rows={5}
          value={payload}
          onChange={event => setPayload(event.target.value)}
        />

        <label htmlFor="runId">Run ID</label>
        <input
          id="runId"
          type="text"
          placeholder="wrun_..."
          value={runId}
          onChange={event => setRunId(event.target.value)}
        />

        <div className="buttons">
          <button onClick={workflowStart}>start</button>
          <button onClick={workflowStatus}>status</button>
          <button onClick={workflowStop}>stop</button>
          <button onClick={workflowSupports}>supports</button>
        </div>
      </section>

      <div id="logs">
        {logs.map(entry => (
          <div key={entry.id} className="log-entry">
            <div>
              <span className="time">
                [
                {entry.time}
                ]
              </span>
              {' '}
              <span className="endpoint">{entry.endpoint}</span>
              {' '}
              {entry.status === 'loading'
                ? (
                    'loading...'
                  )
                : (
                    <span className={entry.status === 'error' ? 'error' : 'success'}>
                      {entry.status === 'error' ? 'ERROR' : `${entry.elapsed}ms`}
                    </span>
                  )}
            </div>
            {entry.status === 'success'
              ? (
                  <pre>{formatJson(entry.data)}</pre>
                )
              : null}
            {entry.status === 'error'
              ? (
                  <pre className="error">{entry.error}</pre>
                )
              : null}
          </div>
        ))}
      </div>
    </main>
  )
}
