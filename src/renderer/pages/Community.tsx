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
          <div className="flex flex-col gap-2 self-center text-2xl font-semibold p-4">
            {t('community.community')}
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
        <p>这个模块还在开发中，如果您有如下需求：</p>
        <br></br>
        <ul>
          <li>• 💬 专业交流：与律师、法务同行探讨实务问题</li>
          <li>• 📚 知识共享：获取最新法律解读、裁判趋势和合同模板</li>
          <li>
            • 🆘 互助答疑：提出具体法律问题，获得社区智能AI+专业人士的双重解答
          </li>
          <li>• 🔔 动态提醒：实时了解法律法规更新和典型判例 请与我们联系！</li>
        </ul>
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
