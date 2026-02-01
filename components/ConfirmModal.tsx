'use client'

import { X, AlertTriangle, CheckCircle, Trash2, HelpCircle } from 'lucide-react'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string | React.ReactNode
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'success' | 'warning' | 'info'
  isLoading?: boolean
  disabled?: boolean
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'warning',
  isLoading = false,
  disabled = false
}: ConfirmModalProps) {
  if (!isOpen) return null

  const icons = {
    danger: <Trash2 size={40} className="text-red-600" />,
    success: <CheckCircle size={40} className="text-green-600" />,
    warning: <AlertTriangle size={40} className="text-orange-600" />,
    info: <HelpCircle size={40} className="text-blue-600" />
  }

  const bgColors = {
    danger: 'bg-red-50',
    success: 'bg-green-50',
    warning: 'bg-orange-50',
    info: 'bg-blue-50'
  }

  const buttonColors = {
    danger: 'bg-red-600 hover:bg-red-700 shadow-red-100',
    success: 'bg-green-600 hover:bg-green-700 shadow-green-100',
    warning: 'bg-orange-600 hover:bg-orange-700 shadow-orange-100',
    info: 'bg-blue-600 hover:bg-blue-700 shadow-blue-100'
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 relative">
        <button 
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2 transition-colors disabled:opacity-50"
        >
          <X size={24} />
        </button>

        <div className="text-center mb-8">
          <div className={`w-20 h-20 ${bgColors[type]} rounded-full flex items-center justify-center mx-auto mb-4`}>
            {icons[type]}
          </div>
          <h2 className="text-2xl font-black text-gray-900">{title}</h2>
          {typeof message === 'string' ? (
            <p className="text-gray-500 mt-2 leading-relaxed whitespace-pre-line">{message}</p>
          ) : (
            <div className="text-gray-500 mt-2 leading-relaxed">{message}</div>
          )}
        </div>

        <div className="grid gap-3">
          <button
            onClick={onConfirm}
            disabled={isLoading || disabled}
            className={`w-full ${buttonColors[type]} text-white py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all shadow-lg active:scale-95 disabled:opacity-50`}
          >
            {isLoading ? (
              <div className="h-6 w-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              confirmText
            )}
          </button>

          <button
            onClick={onClose}
            disabled={isLoading}
            className="w-full bg-white border-2 border-gray-200 text-gray-600 py-4 rounded-2xl font-bold text-lg hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  )
}
