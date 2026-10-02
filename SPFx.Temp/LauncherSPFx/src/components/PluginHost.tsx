/**
 * Plugin Host Component
 * Mounts individual plugins with error handling and lifecycle management
 */

import React, { useEffect, useRef, useState } from 'react';
import { IPlugin } from '../types';
import { useSharedContext } from '../context/SharedContext';

interface PluginHostProps {
  pluginId: string;
  plugin: IPlugin;
  className?: string;
}

/**
 * Error Boundary for plugin errors
 */
interface ErrorBoundaryProps {
  children: React.ReactNode;
  pluginId: string;
  onError?: (error: Error) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Plugin ${this.props.pluginId} error:`, error, errorInfo);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: '16px',
            backgroundColor: '#fde7e7',
            border: '1px solid #dc3545',
            borderRadius: '4px',
            color: '#721c24',
          }}
        >
          <h4 style={{ marginTop: 0 }}>Plugin Error</h4>
          <p>
            Plugin <code>{this.props.pluginId}</code> encountered an error:
          </p>
          <pre
            style={{
              backgroundColor: '#f8f9fa',
              padding: '8px',
              borderRadius: '4px',
              fontSize: '12px',
              overflow: 'auto',
            }}
          >
            {this.state.error?.message}
          </pre>
          <button
            onClick={() => this.setState({ hasError: false })}
            style={{
              padding: '8px 16px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Plugin Host Component
 * Renders a plugin in an isolated container with error handling
 */
export const PluginHost: React.FC<PluginHostProps> = ({
  pluginId,
  plugin,
  className,
}) => {
  const context = useSharedContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const renderPromiseRef = useRef<Promise<any> | null>(null);

  useEffect(() => {
    const initializeAndRender = async () => {
      try {
        if (!containerRef.current) {
          throw new Error('Container ref is not available');
        }

        // Plugin should already be initialized by PluginLoader,
        // but we call initialize again in case of re-mount
        // (good plugins should handle multiple initialize calls gracefully)
        if (!isInitialized && plugin.initialize) {
          await plugin.initialize(context);
        }

        // Render plugin into the container
        if (plugin.render) {
          renderPromiseRef.current = plugin.render(containerRef.current);
          await renderPromiseRef.current;
        }

        setIsInitialized(true);
        setError(null);

        // Publish plugin mounted event
        context.eventBus.publish({
          type: 'plugin:mounted',
          sourcePluginId: pluginId,
          payload: { pluginId },
        });
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        context.logger.error(`Failed to initialize plugin ${pluginId}`, error);
        setError(error);
        context.notificationService.notify(
          `Failed to load plugin ${pluginId}: ${error.message}`,
          'error'
        );
      }
    };

    initializeAndRender();

    // Cleanup on unmount
    return () => {
      const cleanup = async () => {
        try {
          if (plugin.dispose) {
            await plugin.dispose();
          }
          setIsInitialized(false);

          // Publish plugin unmounted event
          context.eventBus.publish({
            type: 'plugin:unmounted',
            sourcePluginId: pluginId,
            payload: { pluginId },
          });
        } catch (err) {
          context.logger.error(
            `Error disposing plugin ${pluginId}`,
            err instanceof Error ? err : new Error(String(err))
          );
        }
      };

      cleanup();
    };
  }, [pluginId, plugin, isInitialized, context]);

  if (error) {
    return (
      <ErrorBoundary
        pluginId={pluginId}
        onError={(err) => {
          context.logger.error(`Plugin render error: ${pluginId}`, err);
        }}
      >
        <div style={{ padding: '16px' }}>
          <p>Error rendering plugin</p>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary pluginId={pluginId}>
      <div
        ref={containerRef}
        className={className}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          minHeight: '100px',
        }}
      >
        {!isInitialized && (
          <div style={{ padding: '16px', color: '#666' }}>
            Loading plugin {pluginId}...
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default PluginHost;
