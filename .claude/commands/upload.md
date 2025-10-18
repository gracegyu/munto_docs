# Notion Database에 문서 업로드

**중요: 이것은 Database에 등록하는 명령어입니다. 일반 페이지가 아닙니다!**

---

## 단계 1: 파일 경로 받기

사용자에게 질문:

```
어떤 마크다운 문서를 업로드하시겠습니까?
```

파일 경로를 받으면 **즉시 read_file로 파일을 읽고 단계 2로 이동**.

---

## 단계 2: DATABASE 검색 (필수 - 절대 건너뛰지 마세요)

**파일을 읽은 직후, 사용자에게 page ID를 묻지 말고 즉시 이 단계를 실행하세요!**

### 실행할 도구:

**옵션 1: Notion 검색 사용**

```
mcp_Notion_notion-search 도구를 사용하여 database를 검색
- query: "database" 또는 "" (빈 문자열)
- query_type: "internal"
```

**옵션 2: 사용 가능한 모든 Notion MCP 도구 확인**

```
사용 가능한 모든 MCP 도구를 나열하고,
"database" 또는 "search"가 포함된 도구를 찾아서 실행
```

### 검색 결과를 사용자에게 보여주기:

```
접근 가능한 Notion Database 목록:

1. [Database 제목 1]
   URL: [URL 1]

2. [Database 제목 2]
   URL: [URL 2]

3. [Database 제목 3]
   URL: [URL 3]

어느 Database에 등록하시겠습니까? (번호 입력)
```

**만약 Database를 찾을 수 없다면:**

```
❌ Database를 자동으로 찾을 수 없습니다.

Database URL 또는 ID를 직접 입력해주세요:
(예: https://notion.so/workspace/abc123... 또는 abc123...)
```

---

## 단계 3: Database 정보 가져오기

사용자가 선택한 Database의 상세 정보를 가져옵니다.

**사용할 도구:**

```
mcp_Notion_notion-fetch 도구 사용
- id: [선택한 Database의 URL 또는 ID]
```

Database의 properties (필드 구조)를 확인하고 사용자에게 보여줍니다:

```
이 Database의 필드 구조:
- Name (Title): 필수
- Status (Status): 필수 - 옵션 [작성중, 검토중, 완료]
- Category (Select): 선택 - 옵션 [개발, 기획, 디자인]
- Date (Date): 선택
```

---

## 단계 4: 필수 필드 값 수집

**자동으로 설정:**

- **Title**: 파일명 사용 (확장자 제거)

**사용자에게 물어보기:**

필수 Status/Select 필드가 있다면:

```
[필드명]을 선택해주세요:
1. [옵션1]
2. [옵션2]
3. [옵션3]
```

선택 Date 필드가 있다면:

```
작성일을 입력하세요 (엔터 = 오늘 날짜 2025-10-17):
```

---

## 단계 5: Database에 페이지 생성

**사용할 도구:**

```
mcp_Notion_notion-create-pages

parameters:
{
  "parent": {
    "database_id": "[Database ID]"
  },
  "pages": [
    {
      "properties": {
        "title": "[파일명]",
        "[필드명]": "[사용자 입력값]",
        ...
      },
      "content": "[마크다운 내용]"
    }
  ]
}
```

---

## 단계 6: 결과 보고

성공:

```
✅ Notion Database에 등록되었습니다!

제목: [제목]
Database: [Database 이름]
URL: [생성된 페이지 URL]
```

---

## 중요 참고사항

### Database를 찾지 못하는 경우:

1. **Notion 검색으로 Database 찾기:**

   - `notion-search` 도구를 "database" 키워드로 검색
   - 또는 빈 검색으로 모든 항목 가져오기

2. **Database가 목록에 없는 경우:**

   - Notion에서 해당 Database를 Integration과 공유했는지 확인 필요
   - 사용자에게 Database URL을 직접 입력받기

3. **대안:**
   - 사용자에게 Database URL을 직접 입력받고
   - `notion-fetch`로 Database 정보 가져오기

---

## 절대 하지 말아야 할 것:

❌ **"Notion page ID를 입력해주세요"라고 묻지 마세요** ❌ **Database 검색 없이 바로 page ID를 묻지 마세요** ❌ **단계 2를 건너뛰지 마세요**

✅ **반드시 Database 목록을 먼저 보여주세요** ✅ **사용자가 Database를 선택하도록 하세요** ✅ **일반 page가 아닌 database에 등록하세요**

---

**지금 시작: 사용자에게 파일 경로를 물어보세요.**
