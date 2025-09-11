import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, Alert, Tabs, message } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useAuth } from '@/renderer/hooks/useAuth';
import { LoginForm, RegisterForm } from '@/types/auth';
import { t } from 'i18next';

const { TabPane } = Tabs;

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (user: any) => void;
}
interface LoginModalRef {}

const LoginModal = React.forwardRef<LoginModalRef, LoginModalProps>(
  (
    { open = false, onClose, onSuccess }: LoginModalProps,
    ref: React.ForwardedRef<LoginModalRef>,
  ) => {
    const [loginForm] = Form.useForm<LoginForm>();
    const [registerForm] = Form.useForm<RegisterForm>();
    const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
    const [submitLoading, setSubmitLoading] = useState(false);

    const { signIn, signUp, loading, error } = useAuth();

    useEffect(() => {
      if (!open) {
        loginForm.resetFields();
        registerForm.resetFields();
        setActiveTab('login');
      }
    }, [open, loginForm, registerForm]);

    const handleLogin = async (values: LoginForm) => {
      setSubmitLoading(true);
      try {
        const result = await signIn(values.email, values.password);

        if (result.success) {
          message.success('登录成功！');
          onSuccess?.(result.data?.user);
          onClose();
        } else {
          message.error(result.error || '登录失败');
        }
      } catch (err) {
        message.error('登录过程中发生错误');
      } finally {
        setSubmitLoading(false);
      }
    };

    const handleRegister = async (values: RegisterForm) => {
      if (values.password !== values.confirmPassword) {
        message.error('两次输入的密码不一致');
        return;
      }

      setSubmitLoading(true);
      try {
        const result = await signUp(values.email, values.password);

        if (result.success) {
          if (result.message) {
            message.info(result.message);
          } else {
            message.success('注册成功！');
            onSuccess?.(result.data?.user);
            onClose();
          }
        } else {
          message.error(result.error || '注册失败');
        }
      } catch (err) {
        message.error('注册过程中发生错误');
      } finally {
        setSubmitLoading(false);
      }
    };

    const handleCancel = () => {
      onClose();
    };

    return (
      <Modal
        title="用户认证"
        open={open}
        onCancel={handleCancel}
        footer={null}
        width={400}
        centered
      >
        <div className="py-4">
          {error && (
            <Alert
              message="认证错误"
              description={error}
              type="error"
              showIcon
              className="mb-4"
            />
          )}

          <Tabs
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as 'login' | 'register')}
            centered
          >
            <TabPane tab="登录" key="login">
              <Form
                form={loginForm}
                name="login"
                onFinish={handleLogin}
                autoComplete="off"
                layout="vertical"
                className="mt-4"
              >
                <Form.Item
                  label="邮箱"
                  name="email"
                  rules={[
                    { required: true, message: '请输入邮箱地址!' },
                    { type: 'email', message: '请输入有效的邮箱地址!' },
                  ]}
                >
                  <Input
                    prefix={<MailOutlined />}
                    placeholder="请输入邮箱地址"
                    size="large"
                  />
                </Form.Item>

                <Form.Item
                  label="密码"
                  name="password"
                  rules={[
                    { required: true, message: '请输入密码!' },
                    { min: 6, message: '密码至少6位字符!' },
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined />}
                    placeholder="请输入密码"
                    size="large"
                  />
                </Form.Item>

                <Form.Item className="mb-2">
                  <Button
                    type="primary"
                    htmlType="submit"
                    className="w-full"
                    size="large"
                    loading={submitLoading || loading}
                  >
                    登录
                  </Button>
                </Form.Item>
              </Form>
            </TabPane>

            <TabPane tab="注册" key="register">
              <Form
                form={registerForm}
                name="register"
                onFinish={handleRegister}
                autoComplete="off"
                layout="vertical"
                className="mt-4"
              >
                <Form.Item
                  label="邮箱"
                  name="email"
                  rules={[
                    { required: true, message: '请输入邮箱地址!' },
                    { type: 'email', message: '请输入有效的邮箱地址!' },
                  ]}
                >
                  <Input
                    prefix={<MailOutlined />}
                    placeholder="请输入邮箱地址"
                    size="large"
                  />
                </Form.Item>

                <Form.Item
                  label="密码"
                  name="password"
                  rules={[
                    { required: true, message: '请输入密码!' },
                    { min: 6, message: '密码至少6位字符!' },
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined />}
                    placeholder="请输入密码（至少6位）"
                    size="large"
                  />
                </Form.Item>

                <Form.Item
                  label="确认密码"
                  name="confirmPassword"
                  dependencies={['password']}
                  rules={[
                    { required: true, message: '请确认密码!' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('password') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(
                          new Error('两次输入的密码不一致!'),
                        );
                      },
                    }),
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined />}
                    placeholder="请再次输入密码"
                    size="large"
                  />
                </Form.Item>

                <Form.Item className="mb-2">
                  <Button
                    type="primary"
                    htmlType="submit"
                    className="w-full"
                    size="large"
                    loading={submitLoading || loading}
                  >
                    注册
                  </Button>
                </Form.Item>
              </Form>
            </TabPane>
          </Tabs>
        </div>
      </Modal>
    );
  },
);

export default LoginModal;
