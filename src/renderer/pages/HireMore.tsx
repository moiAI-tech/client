import { ScrollArea } from '@radix-ui/react-scroll-area';
import Content from '../components/layout/Content';
import React, { useState } from 'react';
import { Button, Modal, Space } from 'antd';
import qr from '../../../assets/qr.png';

interface Props {}

function HireMore(props: Props): React.ReactElement {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <Content>
      <ScrollArea className="p-8 w-full h-full">
        <div>
          如果您有特定的法律需求，或希望进一步了解AI助手的定制化功能，欢迎随时联系我们！我们的团队将为您提供个性化解决方案，帮助您更高效地处理法律事务。
        </div>
        <br></br>
        <p>
          📩 联系方式：
          <Button
            type="link"
            onClick={() => {
              window.electron.app.sendEmail({
                to: ['kaity@ai-paralegals.com'],
                subject: 'test',
                body: 'test',
              });
            }}
          >
            点击链接发送邮件
          </Button>
        </p>
        <p>
          💬 在线咨询：
          <Button
            type="link"
            onClick={() => {
              setIsModalOpen(true);
            }}
          >
            扫码加微信
          </Button>
        </p>
        <br></br>
        <p>我们期待为您提供更专业的支持！</p>
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
