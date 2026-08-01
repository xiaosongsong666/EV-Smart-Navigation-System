import { useRoutes } from 'react-router-dom';
import routes from '@/router/index';
import { motion } from 'framer-motion';
import Layout from './components/Layout';
import 'antd/dist/reset.css'; // v5 推荐使用 reset.css

function App() {
  // useRoutes 动态渲染路由配置（纯 JS 数组，可编程增删）
  const element = useRoutes(routes);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen"
    >
      <Layout>{element}</Layout>
    </motion.div>
  );
}

export default App;
