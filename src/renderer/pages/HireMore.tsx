import { ScrollArea } from '@radix-ui/react-scroll-area';
import Content from '../components/layout/Content';
import React, { useState } from 'react';
import { Button, Modal, Space } from 'antd';
import qr from '../../../assets/qr.png';
import { t } from 'i18next';

interface Props {}

function HireMore(props: Props): React.ReactElement {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <Content>
      <ScrollArea className="p-8 w-full h-full">
        <div>{t('hireMore.welcomeMessage')}</div>
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
        <br></br>
        <p>{t('hireMore.supportMessage')}</p>
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

export default HireMore;
