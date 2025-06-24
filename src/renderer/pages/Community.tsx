import { ScrollArea } from '@radix-ui/react-scroll-area';
import Content from '../components/layout/Content';
import React, { useState } from 'react';
import { Button, Modal, Space } from 'antd';
import qr from '../../../assets/qr.png';
import { t } from 'i18next';

interface Props {}
function Community(props: Props): React.ReactElement {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <Content>
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div className="flex flex-col gap-2 self-center p-4">
            <h1 className="text-2xl font-semibold">
              {t('community.community')}
            </h1>
            <small className="text-sm text-gray-400">
              {t('community.community_description')}
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

      <ScrollArea className="p-8 w-full h-full">
        <p>{t('hireMore.developmentMessage')}</p>
        <br></br>
        <ul>
          <li>• {t('hireMore.professionalExchange')}</li>
          <li>• {t('hireMore.knowledgeSharing')}</li>
          <li>• {t('hireMore.helpAnswer')}</li>
          <li>• {t('hireMore.dynamicReminder')}</li>
        </ul>
        <br></br>
        <p>
          📩 {t('hireMore.contactInformation')}：
          <Button
            type="link"
            onClick={() => {
              window.electron.app.sendEmail({
                to: ['Contact@moi-ai.com'],
                subject: 'test',
                body: 'test',
              });
            }}
          >
            {t('hireMore.clickLinkToSendEmail')}
          </Button>
        </p>
        <p>
          💬 {t('hireMore.onlineConsultation')}：
          <Button
            type="link"
            onClick={() => {
              setIsModalOpen(true);
            }}
          >
            {t('hireMore.weChat')}
          </Button>
        </p>
      </ScrollArea>
      <Modal
        open={isModalOpen}
        footer={null}
        onCancel={() => setIsModalOpen(false)}
      >
        <Space direction="vertical" className="w-full">
          <img src={qr} />
        </Space>
      </Modal>
    </Content>
  );
}

export default Community;
