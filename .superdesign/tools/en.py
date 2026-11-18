"""English copy for the console mockups.

Since 2026-11-18 the console's screens are in English. The builders still
write Vietnamese; build_soft_agent.shell() passes every page through en(),
which swaps whole text nodes (and title, alt, placeholder) from WHOLE, then
the pieces in PARTS, longest first. People's and shops' names stay as they
are.
"""
import re
from html import escape, unescape

WHOLE = {
    # shell and nav
    "Cuộc mới": "New chat", "Tìm": "Search", "Trang chủ": "Home", "Hỗ trợ": "Support", "Báo cáo": "Reports", "Tài khoản": "Accounts",
    "Công cụ": "Tools", "Cấu hình": "Settings", "Hôm nay": "Today", "Hôm qua": "Yesterday", "Kiểm duyệt viên": "Moderator", "Quản trị viên": "Admin",
    "Người và quyền": "People and access", "Giám sát": "Oversight", "Tổng quan": "Overview", "Nhân viên": "Members", "Vai trò": "Roles",
    "Hạn mức": "Budgets", "An toàn": "Guardrails", "Nhật ký thao tác": "Audit log", "Phản hồi": "Feedback",
    # home and chat
    "Chào buổi chiều, Khoa": "Good afternoon, Khoa", "Chào buổi chiều, Lan": "Good afternoon, Lan",
    "Hỏi về ticket, báo cáo, tài khoản…": "Ask about a ticket, a report or an account…", "Hỏi tiếp…": "Ask a follow-up…",
    "Gắn ticket, báo cáo, tài khoản": "Attach a ticket, report or account", "Gửi": "Send",
    "Ticket nào chờ lâu nhất?": "Which ticket has waited longest?", "Báo cáo lừa đảo mới trong hôm nay": "New scam reports today",
    "Đơn GHTK báo giao mà khách chưa nhận": "GHTK orders marked delivered but not received", "Tài khoản sắp hết hạn khoá": "Suspensions ending soon",
    "Tiếp tục": "Continue", "Xem tất cả": "See all", "Báo cáo ·": "Report ·",
    "Nhóm Đồ Cũ Gò Vấp và Trần Đức Anh": "Đồ Cũ Gò Vấp and Trần Đức Anh ring", "Ảnh ký nhận GHTK của Khánh Linh": "Khánh Linh's GHTK proof of delivery",
    "Son Dior 999 có phải hàng giả": "Is the Dior 999 lipstick fake", "Tin súng hơi đăng tuần này": "Air gun listings this week",
    "Lê Thị Hồng bị báo lừa đảo": "Lê Thị Hồng reported for scams", "Ninja Van được xin bao nhiêu lần": "How often Ninja Van is requested",
    "Đồ Cũ Gò Vấp có liên quan tài khoản nào khác không?": "Is Đồ Cũ Gò Vấp linked to other accounts?",
    "Có 2 tài khoản dùng chung địa chỉ lấy hàng hoặc ảnh tin với Đồ Cũ Gò Vấp, và 1 tài khoản đã khoá nhắn đòi cọc cùng mẫu.":
        "2 accounts share a pickup address or listing photos with Đồ Cũ Gò Vấp, and 1 suspended account sent the same deposit message.",
    "14 tin đăng": "14 listings", "2 báo cáo": "2 reports", "Tin nhắn": "Messages", "Tài khoản ·": "Account ·",
    "Liên quan vì": "Linked by", "Trạng thái": "Status", "Hoạt động": "Active", "Đã khoá 30 ngày": "Suspended 30 days",
    "Cùng địa chỉ lấy hàng với Trần Đức Anh": "Same pickup address as Trần Đức Anh", "Ảnh tin trùng 4 tin của Gò Vấp": "Photos match 4 Gò Vấp listings",
    "Nhắn đòi cọc cùng mẫu": "Same deposit message", "Chép": "Copy", "Hỏi lại": "Retry", "Tốt": "Good", "Chưa đúng": "Not right",
    # overview
    "Chi phí tháng 11": "November spend", "Câu hỏi cho agent": "Agent questions", "Đề xuất được giữ": "Proposals kept",
    "Nhân viên dùng agent": "Members using agents", "+2 chưa hỏi": "+2 haven't asked", "so với tháng 10": "vs October", "4 điểm": "4 pts",
    "Chi phí mỗi ngày": "Daily spend", "Đề xuất của agent": "Agent proposals", "412 đề xuất trong tháng": "412 proposals this month",
    "giữ nguyên": "kept", "Giữ": "Kept", "Sửa": "Edit", "Sửa đổi": "Edited", "Ngân sách": "Budget", "Bỏ": "Dropped", "Theo nhân viên": "By member", "Cần xem": "Needs a look",
    "Minh xin tăng hạn mức lên $8": "Minh asks for $8 a day", "Ánh chưa nhận lời mời": "Ánh hasn't accepted the invite",
    "6 câu trả lời bị chê": "6 answers marked not right", "Tháng 11 · 2026": "November 2026", "Tháng 11 · còn 12 ngày": "November · 12 days left",
    "9 nhân viên": "9 members", "5 agents": "5 agents",
    # members
    "Mời nhân viên": "Invite member", "Tên hoặc email": "Name or email", "Tháng này": "This month", "Đang online": "Online",
    "Tạm khoá": "Suspended", "Đã mời": "Invited", "Chưa nhận lời mời": "Invite pending", "5 phút trước": "5 min ago", "1 giờ trước": "1 hour ago",
    "3 ngày trước": "3 days ago", "12 ngày trước": "12 days ago", "8 người": "8 people", "3 đang online": "3 online", "1 lời mời chờ": "1 invite pending",
    "Kiểm duyệt viên · 6": "Moderators · 6", "Quản trị viên · 2": "Admins · 2", "Tất cả · 8": "All · 8", "Tất cả · 6": "All · 6",
    # budgets
    "Cả tháng": "This month", "Đã dùng": "Used", "trên $300": "of $300", "Dự kiến $251": "Projected $251", "Báo 80%": "Alert 80%",
    "Hạn mức tháng": "Monthly budget", "Báo khi chạm": "Alert at", "Khi hết hạn mức": "When it runs out", "Dừng agent": "Stop agents",
    "Theo agent": "By agent", "Mỗi nhân viên, mỗi ngày": "Per member, per day", "Riêng: Hà $7, Minh $6": "Overrides: Hà $7, Minh $6",
    "Yêu cầu tăng": "Increase requests", "Từ chối": "Decline", "Duyệt": "Approve", "Dự kiến $251 cuối tháng": "Projected $251 by month end",
    "Báo ở 80%": "Alert at 80%", "/tháng": "/month", "“Đang rà nhóm lừa đảo Gò Vấp” · 10:24": "“Working the Gò Vấp scam ring” · 10:24",
    "“Trực thay ca tối tuần này” · Hôm qua": "“Covering the night shift this week” · Yesterday",
    # tools
    "Agent đọc được": "What agents can read", "Chỉ đọc": "Read-only", "Công cụ trong nav": "Tools in the nav", "Mọi người": "Everyone",
    "Gọi gần đây": "Recent calls", "Ticket của tài khoản": "Account's tickets", "Lịch sử xử lý": "Action history", "Đơn hàng": "Orders",
    "Tin đăng": "Listings", "Ticket với khách, đơn và vận đơn": "Ticket with the person, order and shipment",
    "Ticket khác của cùng người": "Other tickets from the same person", "Hồ sơ, xác minh, số đơn, báo cáo": "Profile, verification, orders, reports",
    "Các lần khoá, mở khoá": "Suspensions and lifts", "Đơn COD và các mốc giao": "COD order and delivery events",
    "Mọi trạng thái trừ đã xoá": "Any status except deleted", "6 tools chỉ đọc": "6 read-only tools", "8.032 lần gọi · 7 ngày": "8,032 calls · 7 days",
    "6 công cụ ngoài": "6 external tools", "Khánh Linh · chưa nhận hàng": "Khánh Linh · not received",
    # guardrails
    "Ẩn thông tin cá nhân": "Mask personal data", "SĐT, email, số giấy tờ được che": "Phone numbers, emails and ID numbers are masked",
    "Chặn ngoài phạm vi": "Block off-topic", "Từ chối việc không liên quan": "Refuses unrelated requests", "Phát hiện vòng lặp": "Loop detection",
    "Dừng khi gọi lặp một tool": "Stops repeated calls to one tool", "Giới hạn tần suất": "Rate limit", "20 câu mỗi phút mỗi người": "20 questions a minute per member",
    "Nhật ký gọi tool": "Tool call log", "Ai hỏi, tool nào, bản ghi nào": "Who asked, which tool, which record", "Lần chặn theo ngày": "Blocks per day",
    "Gần đây": "Recent", "Nhật ký": "Log", "Che 3 số điện thoại": "Masked 3 phone numbers", "Che 1 email": "Masked 1 email",
    "Từ chối “viết giúp bài đăng bán hàng”": "Refused “write my sales listing”", "Dừng sau 6 lần gọi listing_get": "Stopped after 6 listing_get calls",
    "5/5 đang bật": "5/5 on", "41 lần chặn · 7 ngày": "41 blocks · 7 days",
    # audit
    "7 ngày": "7 days", "Mọi thao tác": "All actions", "Xuất CSV": "Export CSV", "đổi hạn mức ngày của": "changed the daily budget of",
    "khoá 30 ngày": "suspended for 30 days", "ẩn 4 tin của": "hid 4 listings of", "sửa hướng dẫn agent": "edited the agent instructions",
    "mở khoá": "lifted the suspension of", "mời": "invited", "đổi model của": "changed the model of", "Bản 4": "Version 4", "Bản 3 → 4": "Version 3 → 4",
    "Lừa đảo đặt cọc qua chat": "Deposit scam in chat", "Ảnh trùng tin của Gò Vấp": "Photos match Gò Vấp listings", "Hết hạn, đã xác minh lại": "Term ended, verified again",
    "Khoá, mở khoá": "Suspensions", "Ẩn tin": "Hidden listings", "Trả lời ticket": "Ticket replies", "259 thao tác · 7 ngày": "259 actions · 7 days",
    "64% từ đề xuất của agent": "64% from agent proposals",
    # AI: agents, models, providers
    "Trợ lý console": "Console assistant", "Kiểm tra lừa đảo": "Scam check", "Đọc ảnh tin đăng": "Listing photo reader", "Tìm kiếm": "Search",
    "Vector tìm kiếm": "Search embeddings", "Dùng tool": "Tool use", "Ngữ cảnh dài": "Long context", "Suy luận": "Reasoning", "Đầu ra có cấu trúc": "Structured output", "Đa ngôn ngữ": "Multilingual",
    "Đọc ticket, báo cáo, tài khoản và đề xuất cho nhân viên": "Reads tickets, reports and accounts and proposes to members",
    "Đọc tin nhắn trong chat của app và cảnh báo người mua": "Reads in-app chat messages and warns buyers",
    "Điền tên, loại và tình trạng từ ảnh khi người bán đăng tin": "Fills in name, category and condition from a seller's photos",
    "Hiểu câu tìm kiếm tự nhiên trong app": "Understands natural searches in the app", "Biến tin đăng và câu tìm kiếm thành vector": "Turns listings and searches into vectors",
    "Cần": "Needs", "Tạo agent": "Create agent", "5 agents đang chạy": "5 agents running", "$142,30 tháng này": "$142.30 this month", "tháng này": "this month",
    "Tên": "Name", "Dùng ở": "Used in", "Console · trang Agent, Hỗ trợ, Báo cáo": "Console · Agent, Support, Reports", "Model cần có": "Required tags",
    "Có đủ": "Has all", "Tìm model": "Search models", "Ẩn 3 model thiếu tag": "3 models without these tags hidden", "Hiện": "Show",
    "Hướng dẫn": "Instructions", "Bản 4 · 3 bản trước": "Version 4 · 3 earlier", "Giới hạn": "Limits", "Mỗi câu": "Per answer", "Độ dài": "Length",
    "Nhớ": "Memory", "giây": "sec", "lượt": "turns", "Thử trong cuộc mới": "Try in a new chat", "Lưu": "Save", "tên nhân viên": "member name",
    "Bạn là trợ lý của nhân viên ShopNexus, đang hỗ trợ": "You assist ShopNexus staff, currently helping",
    "Đọc qua tools chỉ đọc rồi đề xuất; nhân viên là người làm.": "Read through read-only tools and propose; the member takes action.",
    "Trả lời ngắn, tiếng Việt, nêu nguồn đã đọc.": "Answer briefly, in Vietnamese, and cite what you read.",
    "ShopNexus không giữ tiền: chỉ có COD đồng kiểm.": "ShopNexus holds no money: cash on delivery with inspection only.",
    "Quản lý tag": "Manage tags", "Đồng bộ từ 3 provider · 10:02": "Synced from 3 providers · 10:02", "2 loại · 6 khả năng": "2 types · 6 capabilities",
    "Giá 1M token": "Price per 1M tokens", "Agent đang dùng": "Used by", "Chưa dùng": "Unused", "ngữ cảnh": "context",
    "Thêm provider": "Add provider", "Xoay vòng": "Rotation", "Theo trọng số": "By weight", "Đều nhau": "Even", "Dự phòng theo thứ tự": "Fallback in order",
    "Agent gọi": "Agent calls", "các provider có model": "providers with the model", "Lỗi thì chuyển provider": "Switch provider on error",
    "Ngưng provider lỗi": "Pause a failing provider", "Chờ tối đa mỗi lần": "Timeout per try", "Thành công 24 giờ": "24h success", "lần": "times", "phút": "min",
    "Kéo để đổi thứ tự dự phòng": "Drag to change the fallback order", "Trọng số": "Weight", "Lượt 24 giờ": "24h requests", "Chạy tốt": "Healthy",
    "Tạm ngưng đến 10:45": "Paused until 10:45", "Sai khoá API · 3 lần lỗi": "Invalid API key · 3 errors", "Tương thích OpenAI ·": "OpenAI-compatible ·",
    "4 provider · 3 đang chạy": "4 providers · 3 running", "Xoay vòng theo trọng số": "Rotating by weight", "99,8% thành công": "99.8% success",
    "99,7% thành công": "99.7% success", "33% lượt · 24 giờ": "33% of requests · 24 hours", "Kết nối": "Connection", "Loại": "Type", "Địa chỉ": "Base URL",
    "Khoá API": "API key", "Đổi": "Change", "Thứ tự dự phòng": "Fallback order", "Kết nối được · 7 model · 320 ms": "Connected · 7 models · 320 ms",
    "Thử lại": "Test again", "Model của Anthropic": "Anthropic's models", "Chọn từng model": "Pick models", "Dùng tất cả, tự cập nhật": "All, kept in sync",
    "Bỏ khỏi Anthropic": "Remove from Anthropic", "Thêm model": "Add model", "Tìm trong 7 model của Anthropic": "Search Anthropic's 7 models",
    "Chưa thêm · 3": "Not added · 3", "Thêm": "Add", "1.284 lượt · 7 ngày": "1,284 requests · 7 days",
}

# Pieces inside composed text (figures with units), longest first.
PARTS = {
    "lượt · 7 ngày": "requests · 7 days", "lần chặn · 7 ngày": "blocks · 7 days", "lần ghi · 7 ngày": "entries · 7 days", "lần · 7 ngày": "calls · 7 days",
    "/ngày": "/day", "câu": "questions", "của $300": "of $300", " · Cấu hình · Console": " · Settings · Console", "Cấu hình · ": "Settings · ",
    "Agent · ": "Agent · ", "Báo cáo · ": "Report · ", "Ticket · ": "Ticket · ", " · Hôm qua": " · Yesterday",
}

def _swap(text):
    raw = unescape(text)
    core = raw.strip()
    if not core:
        return text
    if core in WHOLE:
        return escape(raw.replace(core, WHOLE[core]), quote=False)
    out = core
    for k in sorted(PARTS, key=len, reverse=True):
        out = out.replace(k, PARTS[k])
    out = re.sub(r"(?<=\d)\.(?=\d{3}\b)", ",", out)
    # Vietnamese decimals in money and percentages: $142,30 -> $142.30, 99,8% -> 99.8%
    out = re.sub(r"(\$\d+),(\d+)", r"\1.\2", out)
    out = re.sub(r"(\d),(\d+)( ?[%sK])", r"\1.\2\3", out)
    return escape(raw.replace(core, out), quote=False) if out != core else text


def en(html):
    head, sep, body = html.partition("<body>")
    head = head.replace('<html lang="vi">', '<html lang="en">')
    head = re.sub(r"<title>(.*?)</title>", lambda m: "<title>" + " · ".join(WHOLE.get(p, p) for p in unescape(m[1]).split(" · ")) + "</title>", head)
    body = re.sub(r">([^<>]+)<", lambda m: ">" + _swap(m[1]) + "<", body)
    body = re.sub(r'((?:title|alt|placeholder)=")([^"]+)(")', lambda m: m[1] + _swap(m[2]) + m[3], body)
    return head + sep + body
