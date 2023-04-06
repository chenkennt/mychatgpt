import '../css/style.css';
import React, { Component } from 'react';
import ReactDOM from 'react-dom/client';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      messages: [],
      input: ''
    };
  }

  handleInputChange(input) {
    this.setState({ input: input });
  }

  async send() {
    if (this.state.input) {
      this.state.messages.push(`Me: ${this.state.input}`);
      this.setState({ input: '' });
      let res = await fetch(`/chat?session=${this.props.session}`, { method: 'POST', body: this.state.input });
      let reply = await res.text();
      this.state.messages.push(`ChatGPT: ${reply}`);
      this.setState({});
    }
  }

  render() {
    return (
      <div class="container">
        <div className="messages">
          {this.state.messages.map((m, i) => <div key={i}>{m}</div>)}
        </div>
        <div className="input-group mb-3">
          <input type="text" class="form-control" value={this.state.input}
            onChange={e => this.handleInputChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') this.send(); }}
          ></input>
          <button class="btn btn-outline-secondary" type="button">
            <i class="bi bi-send"></i>
          </button>
        </div>
      </div>
    );
  }
}

let element = document.querySelector('#app');
let root = ReactDOM.createRoot(element);
root.render(<App session={Math.random().toString(16).slice(2, 10)} />);