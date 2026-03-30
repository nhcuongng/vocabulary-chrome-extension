import { LOOKUP_ERROR_TYPE, normalizeLookupErrorType } from '../shared/lookupContract.js';

export const NOT_FOUND_COPY = {
  title: 'Không tìm thấy kết quả',
  message: 'Từ bạn chọn chưa có dữ liệu phù hợp trong nguồn hiện tại.',
  searchSuggestionsPrefix: 'Thử tìm kiếm tại:',
  guidance: [
    'Bỏ dấu câu ở đầu/cuối từ.',
    'Chỉ chọn một từ duy nhất.',
    'Thử lại với dạng từ gốc (ví dụ: run thay vì running).',
  ],
};

const ERROR_COPY_BY_TYPE = {
  [LOOKUP_ERROR_TYPE.RATE_LIMIT]: {
    title: 'Bạn đang tra cứu quá nhanh',
    message: 'Hệ thống tạm giới hạn truy vấn để bảo vệ nguồn dữ liệu. Vui lòng thử lại sau ít giây.',
    cta: 'Đợi rồi thử lại',
  },
  [LOOKUP_ERROR_TYPE.NETWORK]: {
    title: 'Mất kết nối mạng',
    message: 'Không thể kết nối đến nguồn từ điển lúc này.',
    cta: 'Thử lại',
  },
  [LOOKUP_ERROR_TYPE.TIMEOUT]: {
    title: 'Yêu cầu bị quá thời gian',
    message: 'Kết nối chậm hơn ngưỡng cho phép. Vui lòng thử lại.',
    cta: 'Thử lại',
  },
  [LOOKUP_ERROR_TYPE.PARSE]: {
    title: 'Không đọc được dữ liệu từ điển',
    message: 'Định dạng dữ liệu nguồn có thể đã thay đổi.',
    cta: 'Đóng',
  },
  [LOOKUP_ERROR_TYPE.UNKNOWN]: {
    title: 'Đã xảy ra lỗi không xác định',
    message: 'Vui lòng thử lại sau ít phút.',
    cta: 'Thử lại',
  },
  [LOOKUP_ERROR_TYPE.INVALID_TOKEN]: {
    title: 'Từ đã chọn không hợp lệ',
    message: 'Hãy chọn một từ tiếng Anh hợp lệ rồi thử lại.',
    cta: 'Đóng',
  },
};

export function getErrorCopyByType(errorType) {
  const normalizedType = normalizeLookupErrorType(errorType);
  return ERROR_COPY_BY_TYPE[normalizedType] ?? ERROR_COPY_BY_TYPE[LOOKUP_ERROR_TYPE.UNKNOWN];
}
