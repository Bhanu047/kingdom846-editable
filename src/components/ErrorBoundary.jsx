import React from 'react'
import Icon from './Icon'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="grid place-items-center py-20">
          <div className="panel panel-glow max-w-md p-8 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-crimson/10 text-crimson">
              <Icon name="shield" size={26} />
            </div>
            <h1 className="mt-4 font-display text-2xl font-bold text-parchment">Something went wrong</h1>
            <p className="mt-2 text-sm text-parchment/60">
              An unexpected error occurred. Try refreshing the page — your data is safe.
            </p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload() }}
              className="btn-primary mt-4"
            >
              <Icon name="refresh" size={14} /> Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
