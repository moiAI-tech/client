import { useContext, useEffect, useMemo, useState } from 'react';
import {
  Link,
  Route,
  Switch,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import {
  FaHome,
  FaCloud,
  FaUserCircle,
  FaSignOutAlt,
  FaMessage,
  FaTools,
  FaBook,
  FaGithub,
  FaInfo,
  FaInfoCircle,
  FaAtom,
  FaPlug,
  FaHubspot,
  FaRegKeyboard,
  FaFolder,
  FaRegFolder,
  FaRobot,
  FaSearch,
  FaRegFileAlt,
  FaEdit,
  FaList,
  FaPen,
  FaUserPlus,
  FaPlus,
} from 'react-icons/fa';
import logo from '../../../../assets/icon.png';
import { FaBots, FaGear, FaRegMessage, FaUserGroup } from 'react-icons/fa6';
import { Menu, Image, Button, message } from 'antd';
import {
  MenuDividerType,
  MenuItemType,
  SubMenuType,
} from 'antd/es/menu/interface';
import { useTheme } from '../theme/ThemeProvider';
import ThemeToggle from '../theme/ThemeToggle';
import i18n from '@/i18n';
import { ChatMode } from '@/types/chat';
import { t } from 'i18next';

export default function Sidebar() {
  const { theme, setTheme } = useTheme();

  const navigate = useNavigate();
  const location = useLocation();

  const [show, setShow] = useState(true);
  const [showSettingModel, setShowSettingModel] = useState(false);
  const [showAboutModel, setShowAboutModel] = useState(false);
  const appInfo = window.electron.app.info();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [defaultSelectedKeys, setDefaultSelectedKeys] = useState([]);
  const [openKeys, setOpenKeys] = useState([]);
  const plusIconClassName = 'dark:text-gray-200';
  const newChat = async (mode: ChatMode, agentName: string) => {
    const chat = await window.electron.chat.create(mode, null, agentName);

    if (mode == 'default') {
      navigate(`/chat/${chat.id}?mode=${mode}`);
      return;
    }
    if (chat) {
      navigate(`/${agentName}/${chat.id}?mode=${mode}`);
    } else {
      message.error('create chat failed');
    }
  };
  const meunList = useMemo(
    () => [
      {
        key: 'assistant',
        label: t('sidebar.assistant'),
        type: 'group',
      },
      {
        key: 'chat',
        icon: <FaRobot />,
        label: (
          <div className="flex flex-row gap-2 justify-between items-center">
            {t('sidebar.chat')}
            <Button
              icon={<FaPlus />}
              type="text"
              size="small"
              className={plusIconClassName}
              onClick={(e) => {
                e.stopPropagation();
                newChat('default', undefined);
              }}
            />
          </div>
        ),
        href: '/chat',
      },
      {
        key: 'review',
        icon: <FaRegFileAlt />,
        label: (
          <div className="flex flex-row gap-2 justify-between items-center">
            {t('sidebar.review')}
            <Button
              icon={<FaPlus />}
              type="text"
              size="small"
              className={plusIconClassName}
              onClick={() => {
                newChat('agent', 'review');
              }}
            />
          </div>
        ),
        href: '/review',
      },
      {
        key: 'draft',
        icon: <FaPen />,
        label: (
          <div className="flex flex-row gap-2 justify-between items-center">
            {t('sidebar.draft')}
            <Button
              icon={<FaPlus />}
              type="text"
              size="small"
              className={plusIconClassName}
              onClick={(e) => {
                e.stopPropagation();
                newChat('agent', 'draft');
              }}
            />
          </div>
        ),
        href: '/draft',
      },
      {
        key: 'summary',
        icon: <FaList />,
        label: (
          <div className="flex flex-row gap-2 justify-between items-center">
            {t('sidebar.summary')}
            <Button
              icon={<FaPlus />}
              type="text"
              size="small"
              className={plusIconClassName}
              onClick={(e) => {
                e.stopPropagation();
                newChat('agent', 'summary');
              }}
            />
          </div>
        ),
        href: '/summary',
      },
      {
        key: 'search',
        icon: <FaSearch />,
        label: (
          <div className="flex flex-row gap-2 justify-between items-center">
            {t('sidebar.search')}
            <Button
              icon={<FaPlus />}
              type="text"
              size="small"
              className={plusIconClassName}
              onClick={(e) => {
                e.stopPropagation();
                newChat('agent', 'search');
              }}
            />
          </div>
        ),
        href: '/search',
      },

      {
        key: 'hire-more',
        icon: <FaUserPlus />,
        label: t('sidebar.hireMore'),
        href: '/hire-more',
      },
      {
        key: 'resources',
        label: t('sidebar.resources'),
        type: 'group',
      },
      {
        key: 'knowledge-base',
        icon: <FaBook />,
        label: t('sidebar.knowledgebase'),
        href: '/knowledge-base',
      },
      {
        key: 'providers',
        icon: <FaCloud />,
        label: t('sidebar.providers'),
        href: '/Providers',
      },
      {
        key: 'files',
        icon: <FaRegFolder />,
        label: t('sidebar.files'),
        href: '/files',
      },
      {
        key: 'community',
        icon: <FaUserGroup />,
        label: t('sidebar.community'),
        href: '/community',
      },
      {
        key: 'settings',
        icon: <FaGear />,
        label: t('sidebar.settings'),
        href: '/settings',
      },
    ],
    [i18n.language],
  );

  //const [meunList, setMeunList] = useState();

  const defaultMeunBottomList = [
    // {
    //   key: 'github',
    //   icon: <FaGithub />,
    //   label: 'Github',
    //   href: 'https://github.com/AimeBox/aime-box',
    // },
  ] as any[];
  const [meunBottomList, setMeunBottomList] = useState([
    ...defaultMeunBottomList,
    // {
    //   key: 'profile',
    //   icon: <FaUserCircle />,
    //   label: 'Profile'
    // } as SubMenuType,
    {
      key: 'theme',
      label: t('sidebar.theme'),
      icon: (
        <div className="flex justify-center items-center w-full text-sm">
          <ThemeToggle />
        </div>
      ),
    },
  ]);

  useEffect(() => {}, []);

  async function signOut() {
    // await supabase.auth.signOut();
    navigate('/chat');
  }
  useEffect(() => {
    const meun = meunList.find((x) => location.pathname.startsWith(x.href));
    if (meun) {
      setTimeout(() => {
        setDefaultSelectedKeys([meun.key]);
      });
    } else {
      setDefaultSelectedKeys([]);
    }
  }, [location]);
  return (
    <>
      {/* <SettingModel
        open={showSettingModel}
        onOk={() => setShowSettingModel(false)}
        onCancel={() => setShowSettingModel(false)}
      /> */}
      {/* <AboutModel open={showAboutModel} onOk={() => setShowAboutModel(false)} />
      <LoginModal open={showLoginModal} onOk={() => setShowLoginModal(false)} /> */}
      <div className="">
        <div className="flex overflow-hidden flex-col h-full bg-gray-50 dark:bg-gray-800">
          <div className="flex flex-row gap-3 items-center p-4">
            <div>
              <img src={logo} alt="logo" className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Moi AI</h1>
              <small className="text-sm font-bold text-gray-400">
                Legai Workspace
              </small>
            </div>
          </div>

          <Menu
            className="flex-1 !px-2 bg-transparent  pt-2"
            mode="inline"
            theme={theme}
            selectedKeys={defaultSelectedKeys}
            defaultSelectedKeys={defaultSelectedKeys}
            style={{ width: 200, border: 'none' }}
            items={meunList}
            onClick={({ item, key, keyPath, domEvent }) => {
              // if (key === 'hire-more') {
              //   window.electron.app.sendEmail({
              //     to: ['kaity@ai-paralegals.com'],
              //     subject: 'test',
              //     body: 'test',
              //   });
              //   return;
              // }
              if (location.pathname.startsWith(item.props.href)) {
                return;
              }
              navigate(item.props.href);
            }}
          />
          <div className="" style={{}}>
            {/* <hr className="border-gray-500" />
            <Menu
              className="!px-2 bg-transparent"
              mode="inline"
              theme={theme}
              inlineCollapsed
              selectable={false}
              triggerSubMenuAction="click"
              defaultSelectedKeys={defaultSelectedKeys}
              //openKeys={openKeys}
              style={{ width: 80, border: 'none' }}
              items={meunBottomList}
              onClick={({ item, key, keyPath, domEvent }) => {
                //setOpenKeys([]);
                if (item.props.href) {
                  window.open(item.props.href, '_blank');
                }
              }}
              onSelect={({ item, key, keyPath, selectedKeys, domEvent }) => {}}
            /> */}
            <div className="flex justify-center items-center px-4 py-4 w-full text-sm">
              {/* {appInfo.version} */}
              <Button
                icon={<FaUserCircle size={30} />}
                type="text"
                size="large"
                className="justify-start items-center w-full font-bold"
              >
                You
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
