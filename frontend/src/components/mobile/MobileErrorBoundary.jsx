import React from 'react';

export class MobileErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error) {
        if (typeof this.props.onError === 'function') {
            this.props.onError(error);
        }
    }

    handleReload = () => {
        if (typeof window !== 'undefined') {
            window.location.reload();
        }
    };

    render() {
        if (!this.state.hasError) {
            return this.props.children;
        }

        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 py-10">
                <div className="apple-glass-heavy rounded-3xl p-6 max-w-sm w-full">
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground/60">Mobile Recovery</p>
                    <h2 className="text-xl font-semibold tracking-tight mt-2">Something slipped.</h2>
                    <p className="text-[12px] text-muted-foreground mt-2">
                        This view hit a temporary issue. Tap below to reload the page.
                    </p>
                    <button
                        onClick={this.handleReload}
                        className="mt-5 w-full h-11 rounded-2xl apple-glass-heavy border-0 text-[11px] uppercase tracking-[0.2em] font-semibold text-foreground/90 hover:bg-white/[0.04] active:scale-95 transition-[transform,background] duration-200"
                    >
                        Reload View
                    </button>
                </div>
            </div>
        );
    }
}

export default MobileErrorBoundary;
