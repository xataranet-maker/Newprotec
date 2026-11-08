
import * as XLSX from 'xlsx';

/**
 * Xuất dữ liệu ra file Excel (.xlsx)
 * @param data Mảng 2 chiều (Mảng các dòng, mỗi dòng là mảng các cột) bao gồm cả tiêu đề
 * @param fileName Tên file (không cần đuôi .xlsx)
 * @param sheetName Tên Sheet trong Excel (mặc định là Sheet1)
 */
export const exportToExcel = (data: any[][], fileName: string, sheetName: string = 'Sheet1') => {
  try {
    // 1. Tạo Workbook mới
    const wb = XLSX.utils.book_new();
    
    // 2. Tạo Worksheet từ dữ liệu mảng
    const ws = XLSX.utils.aoa_to_sheet(data);

    // 3. Thêm Worksheet vào Workbook
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // 4. Ghi file và kích hoạt tải xuống
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  } catch (error) {
    console.error("Lỗi khi xuất file Excel:", error);
    alert("Đã xảy ra lỗi khi xuất file Excel. Vui lòng thử lại.");
  }
};
