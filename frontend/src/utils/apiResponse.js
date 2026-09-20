export const getCollection = (response, resourceName = 'items') => {
  const collection = response?.data?.data;

  if (!Array.isArray(collection)) {
    throw new Error(`Máy chủ trả về danh sách ${resourceName} không hợp lệ.`);
  }

  return collection;
};

export const getResource = (response, resourceName = 'resource') => {
  const resource = response?.data?.data;

  if (!resource || typeof resource !== 'object') {
    throw new Error(`Máy chủ trả về dữ liệu ${resourceName} không hợp lệ.`);
  }

  return resource;
};

export const getApiErrorMessage = (error, fallbackMessage) => {
  const status = error?.response?.status;

  if (error?.code === 'ERR_NETWORK') {
    return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối và thử lại.';
  }

  if (status === 401) {
    return 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.';
  }

  if (status === 403) {
    return 'Bạn không có quyền thực hiện thao tác này.';
  }

  if (status === 501) {
    return 'Chức năng này chưa được backend hỗ trợ.';
  }

  return error?.response?.data?.message || error?.message || fallbackMessage;
};
