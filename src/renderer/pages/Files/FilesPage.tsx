import {
  Form,
  FormProps,
  Input,
  Modal,
  Popconfirm,
  Switch,
  Tag,
  message,
  Spin,
  Select,
  Typography,
  Radio,
  Space,
  Button,
  Divider,
  InputNumber,
  Table,
} from 'antd';
import { useEffect, useState } from 'react';
import {
  FaPlus,
  FaEdit,
  FaTrashAlt,
  FaServer,
  FaDatabase,
  FaMoneyBill,
  FaMoneyCheck,
  FaAngleUp,
  FaAngleDown,
} from 'react-icons/fa';
import { LineChartOutlined, LoadingOutlined } from '@ant-design/icons';

import { Providers, ProviderType } from '@/entity/Providers';
import { t } from 'i18next';
import ProviderIcon from '../../components/common/ProviderIcon';
import { ScrollArea } from '../../components/ui/scroll-area';
import Content from '../../components/layout/Content';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { Files } from '@/entity/Files';

export default function FilesPage() {
  const [open, setOpen] = useState(false);
  const [openModels, setOpenModels] = useState(false);
  const [currentData, setCurrentData] = useState<Providers>(null);
  const [loading, setLoading] = useState(false);
  // const { getAllModels } = useConnection();
  const [providers, setProviders] = useState<Providers[]>([]);
  const [providerTypes, setProviderTypes] = useState<
    { key: string; value: string; icon: string }[]
  >([]);
  const [models, setModels] = useState<[{ name: string; enable: boolean }]>([]);
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();
  const [formModels] = Form.useForm();
  const formModelsValue = Form.useWatch('models', formModels);
  const [scrollY, setScrollY] = useState('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
    pageSizeOptions: [20],
  });
  const [files, setFiles] = useState<Files[]>([]);
  const getData = async () => {
    try {
      setLoading(true);
      const res = await window.electron.db.page(
        'files',
        {},
        pagination.current - 1,
        pagination.pageSize,
        'createdAt desc',
      );
      setFiles(res.items as Files[]);
      setPagination({
        current: 1,
        pageSize: 20,
        total: res.totalCount,
        pageSizeOptions: [20],
      });
    } finally {
      setLoading(false);
    }
  };

  const onChange = async (pagination, filter, sorter) => {
    if (!pagination.current) {
      pagination.current = 1;
    }
    const res = window.electron.db.page(
      'files',
      {},
      pagination.current - 1,
      pagination.pageSize,
      'createdAt desc',
    );
    setFiles(res.items as Files[]);
    pagination.totalCount = res.totalCount;
    setPagination(pagination);
  };

  const onOpenItem = async (record) => {
    window.electron.app.openPath(record.path);
  };

  const dataset_columns = [
    {
      title: t('files.name'),
      dataIndex: 'name',
      key: 'name',
      ellipsis: { showTitle: true },
      render: (text, record, index) => {
        return (
          <div className="flex flex-col">
            <div className="mb-1 text-[18px] font-bold w-fit">{text}</div>
            <Button
              className="p-0 w-fit"
              type="link"
              target="_blank"
              onClick={(e) => {
                e.stopPropagation();
                window.electron.app.openPath(record.path);
              }}
            >
              <div className="text-xs">{record.path}</div>
            </Button>
          </div>
        );
      },
    },
    {
      title: t('files.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 200,
      align: 'center',
      render: (text, record, index) => {
        return dayjs(record.createdAt).format('YYYY-MM-DD HH:mm:ss');
      },
    },
    // {
    //   title: t('knowledge.action'),
    //   width: 100,
    //   align: 'center',
    //   render: (_, record) => (
    //     <Space size="middle">
    //       <Popconfirm
    //         title="Delete the item?"
    //         // onConfirm={() => onDelete(record)}
    //         okText="Yes"
    //         cancelText="No"
    //       >
    //         <Button type="text" icon={<FaTrashAlt />}></Button>
    //       </Popconfirm>
    //     </Space>
    //   ),
    // },
  ];

  useEffect(() => {
    getData();
  }, []);

  return (
    <>
      {contextHolder}
      <Content>
        <div className="flex flex-col justify-between p-4 w-full">
          <div className="px-3 mx-auto w-full md:px-0">
            <div className="mb-6">
              <div className="flex justify-between items-center">
                <div className="flex flex-col gap-2 self-center text-2xl font-semibold">
                  {t('files.file_management')}
                  <small className="text-sm text-gray-400">
                    {t('files.file_management_description')}
                  </small>
                </div>
                {/* <Button
                    onClick={() => onCreate()}
                    shape="round"
                    type="primary"
                    icon={<FaPlus />}
                  >
                    {t('add')}
                  </Button> */}
              </div>
            </div>

            <Table
              className="flex-1"
              scroll={{ y: scrollY }}
              columns={dataset_columns}
              dataSource={files}
              pagination={pagination}
              onChange={onChange}
              rowKey="id"
              size="small"
            />
          </div>
        </div>
      </Content>
    </>
  );
}
