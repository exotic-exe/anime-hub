import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log safely without exposing internal stacks to users
    console.error('Handled application error:', error?.message);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-[#ededed] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center mb-4">
            <span className="text-xl font-black text-white">!</span>
          </div>
          <h1 className="text-2xl font-black text-white mb-2">Something went wrong</h1>
          <p className="text-sm text-zinc-400 max-w-md mb-6">
            A temporary display error occurred. Your session and data are secure.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.href = '/';
            }}
            className="px-6 py-2.5 rounded-full bg-white hover:bg-zinc-200 text-black font-extrabold text-sm transition shadow-lg shadow-white/5"
          >
            Return to Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
