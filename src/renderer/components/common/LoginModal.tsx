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
          message.success(t('auth.loginSuccess'));
          onSuccess?.(result.data?.user);
          onClose();
        } else {
          message.error(result.error || t('auth.loginFailed'));
        }
      } catch (err) {
        message.error(t('auth.loginError'));
      } finally {
        setSubmitLoading(false);
      }
    };

    const handleRegister = async (values: RegisterForm) => {
      if (values.password !== values.confirmPassword) {
        message.error(t('auth.passwordMismatchError'));
        return;
      }

      setSubmitLoading(true);
      try {
        const result = await signUp(values.email, values.password);

        if (result.success) {
          if (result.message) {
            message.info(result.message);
          } else {
            message.success(t('auth.registerSuccess'));
            onSuccess?.(result.data?.user);
            onClose();
          }
        } else {
          message.error(result.error || t('auth.registerFailed'));
        }
      } catch (err) {
        message.error(t('auth.registerError'));
      } finally {
        setSubmitLoading(false);
      }
    };

    const handleCancel = () => {
      onClose();
    };

    return (
      <Modal
        title={t('auth.userAuthentication')}
        open={open}
        onCancel={handleCancel}
        footer={null}
        width={400}
        centered
      >
        <div className="py-4">
          {error && (
            <Alert
              message={t('auth.authenticationError')}
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
            <TabPane tab={t('auth.loginTab')} key="login">
              <Form
                form={loginForm}
                name="login"
                onFinish={handleLogin}
                autoComplete="off"
                layout="vertical"
                className="mt-4"
              >
                <Form.Item
                  label={t('auth.email')}
                  name="email"
                  rules={[
                    { required: true, message: t('auth.emailRequired') },
                    { type: 'email', message: t('auth.emailInvalid') },
                  ]}
                >
                  <Input
                    prefix={<MailOutlined />}
                    placeholder={t('auth.emailPlaceholder')}
                    size="large"
                  />
                </Form.Item>

                <Form.Item
                  label={t('auth.password')}
                  name="password"
                  rules={[
                    { required: true, message: t('auth.passwordRequired') },
                    { min: 6, message: t('auth.passwordMinLength') },
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined />}
                    placeholder={t('auth.passwordPlaceholder')}
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
                    {t('auth.loginButton')}
                  </Button>
                </Form.Item>
              </Form>
            </TabPane>

            <TabPane tab={t('auth.registerTab')} key="register">
              <Form
                form={registerForm}
                name="register"
                onFinish={handleRegister}
                autoComplete="off"
                layout="vertical"
                className="mt-4"
              >
                <Form.Item
                  label={t('auth.email')}
                  name="email"
                  rules={[
                    { required: true, message: t('auth.emailRequired') },
                    { type: 'email', message: t('auth.emailInvalid') },
                  ]}
                >
                  <Input
                    prefix={<MailOutlined />}
                    placeholder={t('auth.emailPlaceholder')}
                    size="large"
                  />
                </Form.Item>

                <Form.Item
                  label={t('auth.password')}
                  name="password"
                  rules={[
                    { required: true, message: t('auth.passwordRequired') },
                    { min: 6, message: t('auth.passwordMinLength') },
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined />}
                    placeholder={t('auth.passwordPlaceholderWithHint')}
                    size="large"
                  />
                </Form.Item>

                <Form.Item
                  label={t('auth.confirmPassword')}
                  name="confirmPassword"
                  dependencies={['password']}
                  rules={[
                    {
                      required: true,
                      message: t('auth.confirmPasswordRequired'),
                    },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('password') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(
                          new Error(t('auth.passwordMismatch')),
                        );
                      },
                    }),
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined />}
                    placeholder={t('auth.confirmPasswordPlaceholder')}
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
                    {t('auth.registerButton')}
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
