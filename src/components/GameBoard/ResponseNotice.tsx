import React from 'react';

interface ResponseNoticeProps {
  title: string;
  hint?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmDisabled?: boolean;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  children?: React.ReactNode;
}

/**
 * 响应提示组件 - 可复用的提示面板
 */
export const ResponseNotice: React.FC<ResponseNoticeProps> = ({
  title,
  hint,
  onConfirm,
  onCancel,
  confirmDisabled = false,
  confirmText = '确定',
  cancelText = '取消',
  showCancel = true,
  children,
}) => {
  return (
    <div className="response-notice">
      <div className="response-notice-text">{title}</div>
      {hint && <div className="response-notice-hint">{hint}</div>}
      {children}
      <div className="response-notice-buttons">
        <button
          className="action-btn btn-confirm"
          onClick={onConfirm}
          disabled={confirmDisabled}
        >
          {confirmText}
        </button>
        {showCancel && onCancel && (
          <button className="action-btn btn-cancel" onClick={onCancel}>
            {cancelText}
          </button>
        )}
      </div>
    </div>
  );
};

interface WaitingNoticeProps {
  message: string;
}

/**
 * 等待提示组件
 */
export const WaitingNotice: React.FC<WaitingNoticeProps> = ({ message }) => {
  return (
    <div className="waiting-notice">
      <div className="waiting-notice-text">{message}</div>
    </div>
  );
};

export default ResponseNotice;
