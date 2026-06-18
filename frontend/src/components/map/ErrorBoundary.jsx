import React, { Component } from 'react';

// Error Boundary for Google Maps
export class MapErrorBoundary extends Component {
	constructor(props) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(error) {
		return { hasError: true };
	}

	componentDidCatch(error, errorInfo) {
		if (this.props.onError) {
			this.props.onError(error);
		}
		console.error("Map Error Boundary caught error:", error, errorInfo);
	}

	render() {
		if (this.state.hasError) {
			return this.props.fallback;
		}
		return this.props.children;
	}
}
