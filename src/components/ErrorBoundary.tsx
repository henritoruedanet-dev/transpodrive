import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, X } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: ''
  };

  public static getDerivedStateFromError(error: Error): State {
    return { 
      hasError: true, 
      errorMessage: error?.message || 'Ocurrió un error inesperado al procesar los datos.' 
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturó una excepción:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-rose-100 max-w-lg w-full p-6 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 shrink-0 border border-rose-200">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-extrabold text-slate-800 text-sm">
                  {this.props.fallbackMessage || 'Aviso: Inconsistencia detectada en el registro'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  La transacción contiene campos incompletos o en formato no estándar.
                </p>
              </div>
              <button
                type="button"
                onClick={this.handleReset}
                className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-600 flex items-center justify-center hover:bg-slate-100 transition-colors"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 text-xs font-mono text-slate-700 break-words">
              {this.state.errorMessage}
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Cerrar y Continuar</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
