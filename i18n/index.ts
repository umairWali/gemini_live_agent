import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      app: {
        title: 'Personal AI Operator',
        version: 'Final Master Build v8.5',
        loading: 'Initializing systems...',
        ready: 'System Ready'
      },
      modes: {
        daily_control: 'Daily Control',
        deep_dev: 'Deep Dev',
        strategy: 'Strategy',
        meeting: 'Meeting',
        qa_review: 'QA Review',
        daemon_admin: 'Daemon Admin',
        audit_mode: 'Audit Mode',
        evolution: 'Evolution'
      },
      actions: {
        send: 'Send',
        dispatch: 'Dispatch',
        start_daemon: 'Start Daemon Service',
        autonomous_mode: 'Autonomous Mode',
        manual_mode: 'Manual Mode',
        engage: 'Engage OS Loop',
        search: 'Search',
        settings: 'Settings',
        export: 'Export',
        import: 'Import',
        clear: 'Clear'
      },
      status: {
        connected: 'Connected',
        disconnected: 'Disconnected',
        healthy: 'Healthy',
        degraded: 'Degraded',
        optimal: 'Optimal',
        ready: 'Ready',
        offline: 'Offline',
        processing: 'Processing...'
      },
      errors: {
        connection_failed: 'Connection failed',
        api_error: 'API Error',
        unknown_error: 'Unknown error',
        reload: 'Reload Application',
        reset: 'Reset & Clear Data'
      },
      notifications: {
        daemon_started: 'Daemon Started',
        daemon_message: 'Background services are now running',
        autonomous_enabled: 'Autonomous Mode Enabled',
        autonomous_message: 'AI will act independently on detected events',
        autonomous_disabled: 'Manual Mode',
        theme_changed: 'Theme Changed',
        error_occurred: 'An error occurred'
      },
      placeholders: {
        search_commands: 'Search commands...',
        search_chat: 'Search chat history...',
        command_input: 'System Command Input...'
      },
      keyboard: {
        ctrl_k: 'Ctrl+K - Command Palette',
        ctrl_a: 'Ctrl+A - Toggle Autonomous',
        ctrl_t: 'Ctrl+T - Toggle Theme',
        esc: 'ESC - Close',
        enter: 'Enter - Select',
        arrows: '↑↓ - Navigate'
      },
      agent_roles: {
        supervisor: 'Supervisor',
        planner: 'Planner',
        executor: 'Executor',
        tester: 'Tester',
        healer: 'Healer',
        autonomous_engineer: 'Autonomous Engineer'
      },
      time: {
        just_now: 'Just now',
        minutes_ago: '{{count}} minutes ago',
        hours_ago: '{{count}} hours ago',
        days_ago: '{{count}} days ago'
      }
    }
  },
  ur: {
    translation: {
      app: {
        title: 'پرسنل AI آپریٹر',
        version: 'فائنل ماسٹر بلڈ v8.5',
        loading: 'سسٹم شروع ہو رہا ہے...',
        ready: 'سسٹم تیار ہے'
      },
      modes: {
        daily_control: 'روزانہ کنٹرول',
        deep_dev: 'گہری ترقی',
        strategy: ' حکمت عملی',
        meeting: 'میٹنگ',
        qa_review: 'کیو اے جائزہ',
        daemon_admin: 'ڈیمون ایڈمن',
        audit_mode: 'آڈٹ موڈ',
        evolution: 'ارتقاء'
      },
      actions: {
        send: 'بھیجیں',
        dispatch: 'روانہ کریں',
        start_daemon: 'ڈیمون سروس شروع کریں',
        autonomous_mode: 'خود مختار موڈ',
        manual_mode: 'دستی موڈ',
        engage: 'OS لوپ شامل ہوں',
        search: 'تلاش',
        settings: 'ترتیبات',
        export: 'ایکسپورٹ',
        import: 'امپورٹ',
        clear: 'صاف'
      },
      status: {
        connected: 'منسلک',
        disconnected: 'منقطع',
        healthy: 'صحت مند',
        degraded: 'کمزور',
        optimal: 'بہترین',
        ready: 'تیار',
        offline: 'آف لائن',
        processing: 'پروسیسنگ...'
      },
      errors: {
        connection_failed: 'کنکشن ناکام',
        api_error: 'API ایرر',
        unknown_error: 'نامعلوم خرابی',
        reload: 'ایپلی کیشن ریلوڈ کریں',
        reset: 'ڈیٹا صاف کریں'
      },
      notifications: {
        daemon_started: 'ڈیمون شروع ہوگیا',
        daemon_message: 'پس منظر سروسز چل رہی ہیں',
        autonomous_enabled: 'خود مختار موڈ فعال',
        autonomous_message: 'AI خود مختار طریقے سے کام کرے گی',
        autonomous_disabled: 'دستی موڈ',
        theme_changed: 'تھیم تبدیل',
        error_occurred: 'ایک خرابی پیش آگئی'
      },
      placeholders: {
        search_commands: 'کمانڈز تلاش کریں...',
        search_chat: 'چیٹ تاریخ تلاش کریں...',
        command_input: 'سسٹم کمانڈ ان پٹ...'
      },
      keyboard: {
        ctrl_k: 'Ctrl+K - کمانڈ پیلیٹ',
        ctrl_a: 'Ctrl+A - خود مختار ٹوگل',
        ctrl_t: 'Ctrl+T - تھیم تبدیل',
        esc: 'ESC - بند',
        enter: 'Enter - منتخب',
        arrows: '↑↓ - نیویگیٹ'
      },
      agent_roles: {
        supervisor: 'نگران',
        planner: 'منصوبہ ساز',
        executor: 'نافذ کنندہ',
        tester: 'ٹیسٹر',
        healer: 'مدافع',
        autonomous_engineer: 'خود مختار انجینئر'
      },
      time: {
        just_now: 'ابھی ابھی',
        minutes_ago: '{{count}} منٹ پہلے',
        hours_ago: '{{count}} گھنٹے پہلے',
        days_ago: '{{count}} دن پہلے'
      }
    }
  },
  hi: {
    translation: {
      app: {
        title: 'पर्सनल AI ऑपरेटर',
        version: 'फाइनल मास्टर बिल्ड v8.5',
        loading: 'सिस्टम प्रारंभ हो रहा है...',
        ready: 'सिस्टम तैयार है'
      },
      modes: {
        daily_control: 'दैनिक नियंत्रण',
        deep_dev: 'गहन विकास',
        strategy: 'रणनीति',
        meeting: 'बैठक',
        qa_review: 'QA समीक्षा',
        daemon_admin: 'डेमॉन एडमिन',
        audit_mode: 'ऑडिट मोड',
        evolution: 'विकास'
      },
      actions: {
        send: 'भेजें',
        dispatch: 'प्रेषित करें',
        start_daemon: 'डेमॉन सेवा शुरू करें',
        autonomous_mode: 'स्वायत्त मोड',
        manual_mode: 'मैनुअल मोड',
        engage: 'OS लूप में शामिल हों',
        search: 'खोज',
        settings: 'सेटिंग्स',
        export: 'निर्यात',
        import: 'आयात',
        clear: 'साफ'
      },
      status: {
        connected: 'जुड़ा हुआ',
        disconnected: 'डिस्कनेक्टेड',
        healthy: 'स्वस्थ',
        degraded: 'कमजोर',
        optimal: 'बेहतरीन',
        ready: 'तैयार',
        offline: 'ऑफलाइन',
        processing: 'प्रोसेसिंग...'
      },
      errors: {
        connection_failed: 'कनेक्शन विफल',
        api_error: 'API त्रुटि',
        unknown_error: 'अज्ञात त्रुटि',
        reload: 'एप्लिकेशन रीलोड करें',
        reset: 'डेटा साफ करें'
      },
      notifications: {
        daemon_started: 'डेमॉन शुरू हुआ',
        daemon_message: 'पृष्ठभूमि सेवाएं चल रही हैं',
        autonomous_enabled: 'स्वायत्त मोड सक्षम',
        autonomous_message: 'AI स्वतंत्र रूप से कार्य करेगी',
        autonomous_disabled: 'मैनुअल मोड',
        theme_changed: 'थीम बदली',
        error_occurred: 'एक त्रुटि हुई'
      },
      placeholders: {
        search_commands: 'कमांड खोजें...',
        search_chat: 'चैट इतिहास खोजें...',
        command_input: 'सिस्टम कमांड इनपुट...'
      },
      keyboard: {
        ctrl_k: 'Ctrl+K - कमांड पैलेट',
        ctrl_a: 'Ctrl+A - स्वायत्त टॉगल',
        ctrl_t: 'Ctrl+T - थीम बदलें',
        esc: 'ESC - बंद',
        enter: 'Enter - चुनें',
        arrows: '↑↓ - नेविगेट'
      },
      agent_roles: {
        supervisor: 'पर्यवेक्षक',
        planner: 'योजनाकार',
        executor: 'कार्यान्वयनकर्ता',
        tester: 'परीक्षक',
        healer: 'हीलर',
        autonomous_engineer: 'स्वायत्त इंजीनियर'
      },
      time: {
        just_now: 'अभी अभी',
        minutes_ago: '{{count}} मिनट पहले',
        hours_ago: '{{count}} घंटे पहले',
        days_ago: '{{count}} दिन पहले'
      }
    }
  },
  zh: {
    translation: {
      app: {
        title: '个人AI操作员',
        version: '最终主版本 v8.5',
        loading: '系统初始化中...',
        ready: '系统就绪'
      },
      modes: {
        daily_control: '日常控制',
        deep_dev: '深度开发',
        strategy: '战略',
        meeting: '会议',
        qa_review: 'QA审查',
        daemon_admin: '守护进程管理',
        audit_mode: '审计模式',
        evolution: '进化'
      },
      actions: {
        send: '发送',
        dispatch: '派遣',
        start_daemon: '启动守护服务',
        autonomous_mode: '自主模式',
        manual_mode: '手动模式',
        engage: '参与OS循环',
        search: '搜索',
        settings: '设置',
        export: '导出',
        import: '导入',
        clear: '清除'
      },
      status: {
        connected: '已连接',
        disconnected: '断开连接',
        healthy: '健康',
        degraded: '降级',
        optimal: '最佳',
        ready: '就绪',
        offline: '离线',
        processing: '处理中...'
      },
      errors: {
        connection_failed: '连接失败',
        api_error: 'API错误',
        unknown_error: '未知错误',
        reload: '重新加载应用',
        reset: '重置并清除数据'
      },
      notifications: {
        daemon_started: '守护进程已启动',
        daemon_message: '后台服务正在运行',
        autonomous_enabled: '自主模式已启用',
        autonomous_message: 'AI将独立运行',
        autonomous_disabled: '手动模式',
        theme_changed: '主题已更改',
        error_occurred: '发生错误'
      },
      placeholders: {
        search_commands: '搜索命令...',
        search_chat: '搜索聊天历史...',
        command_input: '系统命令输入...'
      },
      keyboard: {
        ctrl_k: 'Ctrl+K - 命令面板',
        ctrl_a: 'Ctrl+A - 切换自主模式',
        ctrl_t: 'Ctrl+T - 切换主题',
        esc: 'ESC - 关闭',
        enter: 'Enter - 选择',
        arrows: '↑↓ - 导航'
      },
      agent_roles: {
        supervisor: '监督员',
        planner: '规划师',
        executor: '执行者',
        tester: '测试员',
        healer: '修复者',
        autonomous_engineer: '自主工程师'
      },
      time: {
        just_now: '刚刚',
        minutes_ago: '{{count}}分钟前',
        hours_ago: '{{count}}小时前',
        days_ago: '{{count}}天前'
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
