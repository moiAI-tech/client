import { useEffect, useRef, useState } from 'react';

import {
  Link,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import { FormSchema } from '../../../types/form';
import {
  Button,
  Form,
  Input,
  Popconfirm,
  Radio,
  Select,
  Slider,
  Space,
  Switch,
  Table,
  Tag,
  message,
} from 'antd';
import { FaEdit, FaFolder, FaPlus, FaTrashAlt } from 'react-icons/fa';
import TextArea from 'antd/es/input/TextArea';
import List from '@/renderer/components/common/List';
import FormModal from '@/renderer/components/modals/FormModal';
import { ScrollArea } from '@/renderer/components/ui/scroll-area';
import ProviderSelect from '@/renderer/components/providers/ProviderSelect';
import Content from '@/renderer/components/layout/Content';
import { KnowledgeBase } from '@/entity/KnowledgeBase';
import { ListItem } from '@/renderer/components/common/ListItem';
import { t } from 'i18next';
import KnowledgeBaseContent from './KnowledgeBaseContent';

export default function KnowledgeBasePage() {
  const location = useLocation();
  // const [open, setOpen] = useState(false);
  // const [currentMode, setCurrentMode] = useState(undefined);
  const [list, setList] = useState<KnowledgeBase[]>([]);
  const [currentKB, setCurrentKB] = useState<KnowledgeBase | undefined>(
    undefined,
  );
  const navigate = useNavigate();
  // const [currentEditKbId, setCurrentEditKbId] = useState(undefined);
  const kbModalRef = useRef(null);

  const schemas = [
    {
      label: t('knowledge.name'),
      field: 'name',
      required: true,
      component: 'Input',
    },
    {
      label: t('knowledge.description'),
      field: 'description',
      required: true,
      component: 'InputTextArea',
    },
    {
      label: t('knowledge.tags'),
      field: 'tags',
      component: 'Select',
      required: false,
      componentProps: {
        mode: 'tags',
      },
    },
    {
      label: t('knowledge.vectorStoreType'),
      field: 'vectorStoreType',
      required: true,
      component: 'Select',
      defaultValue: 'lancedb',
      componentProps: {
        options: [
          { value: 'lancedb', label: 'lancedb' },
          // { value: 'pgvector', label: 'PGVector' },
          // { value: 'milvus', label: 'Milvus' },
        ],
      },
      ifShow({ values }) {
        return !values.id;
      },
    },
    {
      label: 'Embedding',
      field: 'embedding',
      required: true,

      subLabel: t('knowledge.embedding_sublabel'),
      defaultValue: 'BAAI/bge-m3@moi',
      component: <ProviderSelect type="embedding" />,
      ifShow({ values }) {
        return !values.id;
      },
    },
    {
      label: 'Reranker',
      field: 'reranker',
      required: false,
      defaultValue: 'BAAI/bge-reranker-v2-m3@moi',
      component: <ProviderSelect type="reranker" allowClear />,
    },
  ] as FormSchema[];
  const getData = async () => {
    const res = window.electron.db.getMany<KnowledgeBase>('knowledgebase', {});
    console.log(res);
    setList(res);
  };

  const onKBSubmit = async (values) => {
    values.tags = values.tags;
    values.vectorStoreConfig = {};
    values.reranker = values.reranker || null;
    if (currentKB) {
      await window.electron.kb.update(currentKB.id, values);
    } else {
      await window.electron.kb.create(values);
    }
    await getData();
    kbModalRef.current.openModal(false);
    message.success('success');
  };
  const onSearch = () => {};

  const onDelete = async (item) => {
    try {
      await window.electron.kb.delete(item.id);
      await getData();
      navigate(`/knowledge-base`);
      message.success('success');
    } catch (err) {
      message.error(err);
    }
  };

  useEffect(() => {
    getData();
  }, []);

  useEffect(() => {
    const kbId = location.pathname.split('/')[2];

    if (kbId) {
      setCurrentKB(list.find((x) => x.id == kbId));
      // setCurrentMode('dataset');
    } else {
      setCurrentKB(undefined);
    }
  }, [location.pathname]);

  return (
    <Content>
      <div className="flex flex-row w-full h-full">
        <List
          width={250}
          showSearch={false}
          // onSearch={onSearch}
          // se
          onAdd={() => {
            setCurrentKB(undefined);
            navigate(`/knowledge-base`);
            kbModalRef.current.openModal(true);
          }}
        >
          <div className="flex flex-col gap-1">
            <div className="flex flex-row gap-2 justify-between items-center p-2 w-full">
              <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-semibold">
                  {t('knowledge.knowledgebase')}
                </h1>
                <small className="text-sm text-gray-400">
                  {t('knowledge.knowledgebase_description')}
                </small>
              </div>
            </div>
            <div className="p-2 text-sm text-gray-400">
              {t('knowledge.public_database')}
            </div>
            {list
              .filter((x) => x.isStatic)
              .map((item, index) => {
                return (
                  <ListItem
                    title={item.name}
                    icon={<FaFolder />}
                    active={item.id === currentKB?.id}
                    href={`/knowledge-base/${item.id}`}
                    menu={
                      <div className="flex flex-col">
                        <Button
                          type="text"
                          icon={<FaEdit />}
                          onClick={(e) => {
                            setCurrentKB(item);
                            kbModalRef.current.openModal(true, item);
                          }}
                        >
                          {t('edit')}
                        </Button>
                        <Popconfirm
                          title="Delete the item?"
                          onConfirm={() => onDelete(item)}
                          okText="Yes"
                          cancelText="No"
                        >
                          <Button type="text" danger icon={<FaTrashAlt />}>
                            {t('delete')}
                          </Button>
                        </Popconfirm>
                      </div>
                    }
                  ></ListItem>
                );
              })}
            <div className="flex flex-row justify-between items-center p-2 text-sm text-gray-400">
              {t('knowledge.private_database')}
              <Button
                type="text"
                icon={<FaPlus />}
                onClick={() => {
                  setCurrentKB(undefined);
                  navigate(`/knowledge-base`);
                  kbModalRef.current.openModal(true);
                }}
              />
            </div>
            {list
              .filter((x) => !x.isStatic)
              .map((item, index) => {
                return (
                  <ListItem
                    title={item.name}
                    icon={<FaFolder />}
                    active={item.id === currentKB?.id}
                    href={`/knowledge-base/${item.id}`}
                    menu={
                      <div className="flex flex-col">
                        <Button
                          type="text"
                          icon={<FaEdit />}
                          onClick={(e) => {
                            setCurrentKB(item);
                            kbModalRef.current.openModal(true, item);
                          }}
                        >
                          {t('edit')}
                        </Button>
                        <Popconfirm
                          title="Delete the item?"
                          onConfirm={() => onDelete(item)}
                          okText="Yes"
                          cancelText="No"
                        >
                          <Button type="text" danger icon={<FaTrashAlt />}>
                            {t('delete')}
                          </Button>
                        </Popconfirm>
                      </div>
                    }
                  ></ListItem>
                );
              })}
          </div>
        </List>
        <div className="flex flex-col flex-1 w-full min-w-0 h-full min-h-full">
          <Routes>
            <Route
              path="/:id"
              element={<KnowledgeBaseContent knowledgeBaseId={currentKB?.id} />}
            />
          </Routes>
        </div>
      </div>

      <FormModal
        title={
          currentKB?.id
            ? t('knowledgebase.edit_knowledgebase')
            : t('knowledgebase.create_knowledgebase')
        }
        ref={kbModalRef}
        schemas={schemas}
        formProps={{ layout: 'vertical' }}
        onFinish={(values) => onKBSubmit(values)}
        onCancel={() => {
          kbModalRef.current.openModal(false);
        }}
      />
    </Content>
  );
}
