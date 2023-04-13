import '../css/style.css';
import React, { Component, Fragment } from 'react';
import ReactDOM from 'react-dom/client';
import cx from 'classnames';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism/index.js';
import AnimateHeight from 'react-animate-height';

class App extends Component {
  newChat = { name: 'New chat' };

  messages = React.createRef();

  draft = React.createRef();

  state = {
    sessions: [],
    current: this.newChat,
    editingSession: undefined,
    showSessions: false,
    messages: [],
    input: ''
  };

  async switchSession(session) {
    if (session.id) {
      let res = await fetch(`/chat/${session.id}/messages`);
      let history = await res.json();
      this.setState({
        current: session,
        editingSession: undefined,
        showSessions: false,
        messages: history.map(m => {
          return {
            from: m.role === 'user' ? 'me' : 'ChatGPT',
            content: m.content,
            date: new Date(m.date)
          };
        })
      });
    } else {
      this.setState({
        current: this.newChat,
        editingSession: undefined,
        showSessions: false,
        messages: []
      });
    }
  }

  async send() {
    let input = this.state.input;
    if (input) {
      this.state.messages.push({
        from: 'me',
        content: this.state.input,
        date: new Date()
      });
      this.setState({ input: '' });
      let current = this.state.current;
      if (!current.id) {
        let res = await fetch(`/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: `Chat on ${new Date().toLocaleString()}` })
        });
        current = await res.json();
        this.state.sessions.push(current);
        this.setState({ current: current });
      }
      let res = await fetch(`/chat/${current.id}/messages`, { method: 'POST', body: input });
      let reply = await res.text();
      this.state.messages.push({
        from: 'ChatGPT',
        content: reply,
        date: new Date()
      });
      this.setState({});
    }
  }

  async updateSession() {
    let session = this.state.editingSession?.session;
    let name = this.state.editingSession?.name;
    if (session && name) {
      await fetch(`/chat/${session.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name })
      });
      session.name = name;
      this.setState({ editingSession: undefined });
    }
  }

  async deleteSession() {
    let session = this.state.editingSession?.session;
    if (session) {
      await fetch(`/chat/${session.id}`, { method: 'DELETE' });
      this.state.sessions = this.state.sessions.filter(s => s.id !== session.id);
      this.switchSession(this.state.sessions[0] || this.newChat);
    }
  }

  renderMarkdown(content) {
    return (
      <ReactMarkdown
        children={content}
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline ? <SyntaxHighlighter {...props} children={String(children).replace(/\n$/, '')} style={vscDarkPlus} language={match?.[1]} PreTag="div" />
              : <code {...props} className={className}> {children}</code>;
          }
        }}
      />
    );
  }

  getDate(date) {
    return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
  }

  async componentDidMount() {
    let res = await fetch('/chat');
    this.setState({ sessions: await res.json() });
  }

  componentDidUpdate(prevProps, prevState) {
    let m = this.messages.current;
    if (m) m.scrollTo(0, m.scrollHeight);
    if (prevState.current !== this.state.current) this.draft.current?.focus();
  }

  renderSession(session, key) {
    let inEdit = this.state.editingSession?.session === session;
    let updating = this.state.editingSession?.action === 'update';
    return (
      <div key={key} className={cx('bg-light', 'session', { 'current-session': session === this.state.current })} onClick={() => { if (!inEdit) this.switchSession(session) }}>
        <div className="limit-width session-content">
          {inEdit ?
            <Fragment>
              {updating ?
                <input type="text" autoFocus placeholder="Name the session..." className="form-control update-session-input" value={this.state.editingSession.name}
                  onClick={e => e.stopPropagation()}
                  onChange={e => { this.state.editingSession.name = e.target.value; this.setState({}); }}
                  onKeyDown={e => { if (e.key === 'Enter') this.updateSession(); }} />
                :
                <div className="delete-session">{`Delete '${session.name}'?`}</div>
              }
              <button className="btn yes-button borderless-button" type="button" disabled={updating && !this.state.editingSession?.name} onClick={() => updating ? this.updateSession() : this.deleteSession()}>
                <i className="bi bi-check fs-4" />
              </button>
              <button className="btn borderless-button" type="button" onClick={() => this.setState({ editingSession: undefined })}>
                <i className="bi bi-x fs-4" />
              </button>
            </Fragment>
            :
            <Fragment>
              <div>
                <i className={cx('bi', 'me-2', session.id ? 'bi-chat' : 'bi-plus-lg')} />
                <span>{session.name}</span>
              </div>
              {session.id &&
                <div>
                  <i className="bi bi-pencil me-2 floating-button" onClick={e => { this.setState({ editingSession: { session: session, action: 'update', name: session.name } }); e.stopPropagation(); }} />
                  <i className="bi bi-trash floating-button" onClick={e => { this.setState({ editingSession: { session: session, action: 'delete' } }); e.stopPropagation(); }} />
                </div>
              }
            </Fragment>
          }
        </div>
      </div>
    );
  }

  render() {
    return (
      <Fragment>
        <nav className="navbar navbar-expand bg-light">
          <div className="container-fluid">
            <div className="limit-width session-title">
              <div className="session-title-content fs-4 fw-bold" onClick={() => this.setState({ showSessions: !this.state.showSessions, editingSession: undefined })}>
                <span className="me-2">{this.state.current.name}</span>
                <i className="bi bi-caret-down-fill fs-6" />
              </div>
            </div>
          </div>
        </nav>
        <AnimateHeight duration={200} height={this.state.showSessions ? 'auto' : 0} easing="ease-in-out">
          <div className="sessions">
            {this.state.sessions.concat(this.newChat).map((s, i) => this.renderSession(s, i))}
          </div>
        </AnimateHeight>
        <div className="messages pt-3 limit-width" ref={this.messages}>
          {this.state.messages.map((m, i) =>
            <div key={i} className={cx({ 'local-message': m.from === 'me' })}>
              <div className="message mb-3 p-3">
                <div className="message-header mb-1">{m.from !== 'me' ? m.from : ''} {this.getDate(m.date)}</div>
                <div className="message-content">{this.renderMarkdown(m.content)}</div>
              </div>
            </div>
          )}
        </div>
        <div className="input-box limit-width">
          <input type="text" ref={this.draft} autoFocus placeholder="Send a message..." className="form-control message-input" value={this.state.input}
            onChange={e => this.setState({ input: e.target.value })}
            onKeyDown={e => { if (e.key === 'Enter') this.send(); }} />
          <button className="btn send-button borderless-button" type="button" disabled={!this.state.input}
            onClick={() => this.send()}>
            <i className="bi bi-send" />
          </button>
        </div>
      </Fragment>
    );
  }
}

let element = document.querySelector('#app');
let root = ReactDOM.createRoot(element);
root.render(<App />);