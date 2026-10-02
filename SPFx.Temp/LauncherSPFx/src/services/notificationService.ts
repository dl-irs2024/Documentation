import { INotificationService } from '../types';

/**
 * Notification service for user feedback
 */
export class NotificationService implements INotificationService {
  private notificationContainer: HTMLElement | null = null;

  constructor() {
    this.initializeContainer();
  }

  /**
   * Show a notification message
   */
  public notify(message: string, type: 'info' | 'success' | 'warning' | 'error'): void {
    if (!this.notificationContainer) {
      this.initializeContainer();
    }

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.setAttribute('role', 'alert');
    notification.style.cssText = `
      padding: 12px 16px;
      margin-bottom: 8px;
      border-radius: 4px;
      font-size: 14px;
      animation: slideIn 0.3s ease-out;
    `;

    const colorMap = {
      info: { bg: '#e3f2fd', text: '#1976d2', border: '#1976d2' },
      success: { bg: '#e8f5e9', text: '#388e3c', border: '#388e3c' },
      warning: { bg: '#fff3e0', text: '#f57c00', border: '#f57c00' },
      error: { bg: '#ffebee', text: '#c62828', border: '#c62828' }
    };

    const colors = colorMap[type];
    notification.style.backgroundColor = colors.bg;
    notification.style.color = colors.text;
    notification.style.borderLeft = `4px solid ${colors.border}`;
    notification.textContent = message;

    this.notificationContainer?.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }, 5000);

    console.log(`[${type.toUpperCase()}] ${message}`);
  }

  /**
   * Show a confirmation dialog
   */
  public async openDialog(title: string, content: string): Promise<boolean> {
    return new Promise((resolve) => {
      const dialogOverlay = document.createElement('div');
      dialogOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      `;

      const dialog = document.createElement('div');
      dialog.style.cssText = `
        background: white;
        border-radius: 8px;
        padding: 24px;
        min-width: 300px;
        max-width: 500px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
      `;

      const titleEl = document.createElement('h3');
      titleEl.textContent = title;
      titleEl.style.cssText = 'margin: 0 0 12px 0; font-size: 18px; font-weight: 600;';
      dialog.appendChild(titleEl);

      const contentEl = document.createElement('p');
      contentEl.textContent = content;
      contentEl.style.cssText = 'margin: 0 0 16px 0; font-size: 14px; line-height: 1.5;';
      dialog.appendChild(contentEl);

      const buttonContainer = document.createElement('div');
      buttonContainer.style.cssText = 'display: flex; gap: 8px; justify-content: flex-end;';

      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.cssText = `
        padding: 8px 16px;
        border: 1px solid #ccc;
        border-radius: 4px;
        background: white;
        cursor: pointer;
        font-size: 14px;
      `;
      cancelBtn.addEventListener('click', () => {
        dialogOverlay.remove();
        resolve(false);
      });

      const okBtn = document.createElement('button');
      okBtn.textContent = 'OK';
      okBtn.style.cssText = `
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        background: #0078d4;
        color: white;
        cursor: pointer;
        font-size: 14px;
      `;
      okBtn.addEventListener('click', () => {
        dialogOverlay.remove();
        resolve(true);
      });

      buttonContainer.appendChild(cancelBtn);
      buttonContainer.appendChild(okBtn);
      dialog.appendChild(buttonContainer);

      dialogOverlay.appendChild(dialog);
      document.body.appendChild(dialogOverlay);

      // Focus OK button
      okBtn.focus();
    });
  }

  /**
   * Download a file
   */
  public downloadFile(filename: string, data: Blob): void {
    try {
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      this.notify(`File downloaded: ${filename}`, 'success');
    } catch (err) {
      console.error('Error downloading file:', err);
      this.notify('Failed to download file', 'error');
    }
  }

  /**
   * Initialize notification container
   */
  private initializeContainer(): void {
    if (document.getElementById('notification-container')) {
      this.notificationContainer = document.getElementById('notification-container');
      return;
    }

    this.notificationContainer = document.createElement('div');
    this.notificationContainer.id = 'notification-container';
    this.notificationContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 999;
      max-width: 400px;
    `;

    document.body.appendChild(this.notificationContainer);

    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(400px);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }
}
