import { useState } from 'react';

export default function AdminTest() {
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const testLogin = async () => {
    try {
      setStatus('正在登录...');
      const response = await fetch('/api/admin-basic?action=login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ password })
      });

      if (response.ok) {
        const result = await response.json();
        setStatus('登录成功！');
        setIsLoggedIn(true);
        console.log('Login result:', result);
      } else {
        const error = await response.text();
        setStatus(`登录失败: ${error}`);
      }
    } catch (error) {
      setStatus(`网络错误: ${error}`);
    }
  };

  const checkStatus = async () => {
    try {
      const response = await fetch('/api/admin-basic?action=me', {
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        setStatus('已登录');
        setIsLoggedIn(true);
        console.log('Status result:', result);
      } else {
        setStatus('未登录');
        setIsLoggedIn(false);
      }
    } catch (error) {
      setStatus(`检查状态失败: ${error}`);
    }
  };

  const testHealth = async () => {
    try {
      const response = await fetch('/api/admin-basic?action=health');
      const result = await response.json();
      setStatus(`健康检查: ${JSON.stringify(result)}`);
    } catch (error) {
      setStatus(`健康检查失败: ${error}`);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
      <h1>管理员登录测试</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button onClick={testHealth} style={{ marginRight: '10px' }}>
          测试健康检查
        </button>
        <button onClick={checkStatus}>
          检查登录状态
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="输入管理员密码"
          style={{ padding: '8px', marginRight: '10px', width: '200px' }}
        />
        <button onClick={testLogin}>
          登录
        </button>
      </div>

      <div style={{ 
        padding: '10px', 
        backgroundColor: isLoggedIn ? '#d4edda' : '#f8d7da',
        border: `1px solid ${isLoggedIn ? '#c3e6cb' : '#f5c6cb'}`,
        borderRadius: '4px'
      }}>
        <strong>状态:</strong> {status}
      </div>

      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        <p>测试步骤：</p>
        <ol>
          <li>点击"测试健康检查"确认API工作</li>
          <li>输入密码 "Dreammore123"</li>
          <li>点击"登录"</li>
          <li>点击"检查登录状态"验证会话</li>
        </ol>
      </div>
    </div>
  );
}
