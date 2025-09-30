- backend i18n 가이드
    - 메시지 추출 : i18n:extract
    - po → json : i18n:compile
        - po2json을 사용하여 json을 만들고
        - json을 nestjs-i18n에 맞게 한번더 변환한다.
            
            ```bash
            #!/usr/bin/env node
            
            /**
             * @file convert-po-json.js
             * @description PO2JSON으로 생성된 JSON 파일을 nestjs-i18n이 기대하는 형식으로 변환
             * @author Jeon Gyuhyeon <gracegyu@gmail.com>
             * @copyright 2025 Jeon Gyuhyeon. All rights reserved.
             * @license Proprietary and confidential
             * @since 2025.04.09
             *
             * This source code is licensed under the Jeon Gyuhyeon license
             * that can be found in the LICENSE file.
             */
            
            const fs = require('fs');
            const path = require('path');
            
            /**
             * po2json의 출력 포맷을 nestjs-i18n이 기대하는 형식으로 변환
             * 사용법: node convert-po-json.js <input-file> <output-file> [output-folder]
             *
             * 예시:
             * node convert-po-json.js i18n/ko.json i18n/ko/main.json
             */
            
            // 커맨드 라인 인자 가져오기
            const args = process.argv.slice(2);
            const inputFile = args[0];
            const outputFile = args[1] || inputFile;
            
            if (!inputFile) {
              console.error('Error: Input file is required');
              console.error(
                'Usage: node convert-po-json.js <input-file> <output-file> [output-folder]',
              );
              process.exit(1);
            }
            
            try {
              // 입력 파일 읽기
              const jsonData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
            
              // 변환된 데이터를 위한 새 객체 생성
              const convertedData = {};
            
              // 원본 데이터의 각 키 처리
              for (const key in jsonData) {
                // 메타데이터 항목 건너뛰기 (빈 문자열 키)
                if (key === '') continue;
            
                const value = jsonData[key];
            
                // 1. 배열 형식인 경우 처리 (po2json의 기본 출력 형식)
                if (Array.isArray(value) && value.length >= 2) {
                  // 두 번째 요소를 번역으로 사용 (첫 번째는 보통 null 또는 복수형 키)
                  const translation = value[1];
                  if (translation) {
                    convertedData[key] = translation;
                  } else {
                    // 번역이 비어 있으면 키를 대체 텍스트로 사용
                    convertedData[key] = key;
                  }
                }
                // 2. 문자열인 경우 직접 사용 (수동으로 편집된 파일 등)
                else if (typeof value === 'string') {
                  convertedData[key] = value;
                }
                // 3. 객체인 경우 (중첩된 구조를 가진 경우)
                else if (typeof value === 'object' && value !== null) {
                  // 단순화를 위해 현재는 첫 수준의 키-값만 처리
                  convertedData[key] = value;
                }
                // 4. 기타 예상치 못한 형식의 경우
                else {
                  console.warn(`Unexpected format for key "${key}", using key as value`);
                  convertedData[key] = key;
                }
              }
            
              // 변환된 데이터가 비어있는지 확인
              const isEmptyObject = Object.keys(convertedData).length === 0;
            
              // 비어있다면 경고 로그 출력
              if (isEmptyObject) {
                console.warn(`Warning: No translations found in ${inputFile}`);
              }
            
              // 출력 디렉토리가 없으면 생성
              const outputDir = path.dirname(outputFile);
              if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
              }
            
              // 변환된 데이터를 출력 파일에 쓰기
              fs.writeFileSync(outputFile, JSON.stringify(convertedData, null, 2), 'utf8');
            
              console.log(
                `Successfully converted ${inputFile} to nestjs-i18n compatible format`,
              );
              console.log(`Output saved to ${outputFile}`);
            
              // 디버깅 정보 출력
              console.log(`Total keys converted: ${Object.keys(convertedData).length}`);
            } catch (error) {
              console.error(`Error processing file: ${error.message}`);
              process.exit(1);
            }
            
            ```
            
            []()
            
    
    ```
        "i18n:init": "mkdir -p i18n/ko i18n/en",
        "i18n:xgettext": "find src -type f \\( -name \"*.ts\" \\) -not -path \"*/migrations/*\" -print > i18n/filelist.txt && xgettext --from-code=UTF-8 --language=JavaScript --no-location --keyword=this.i18n.t:1 --keyword=t:1 --add-comments=TRANSLATORS: --files-from=i18n/filelist.txt --force-po --output=i18n/template.pot",
        "i18n:update-ko": "[ -f i18n/ko.po ] && (msgmerge --update --no-fuzzy-matching --backup=none i18n/ko.po i18n/template.pot || true) || msginit --no-translator --locale=ko --input=i18n/template.pot --output-file=i18n/ko.po",
        "i18n:update-en": "[ -f i18n/en.po ] && (msgmerge --update --no-fuzzy-matching --backup=none i18n/en.po i18n/template.pot || true) || msginit --no-translator --locale=en --input=i18n/template.pot --output-file=i18n/en.po && msgen i18n/en.po -o i18n/en.po",
        "i18n:update": "pnpm i18n:update-ko && pnpm i18n:update-en",
        "i18n:extract": "pnpm i18n:init && pnpm i18n:xgettext && pnpm i18n:update",
        
        => 여기서 번역
        
        "i18n:compile-ko": "npx po2json i18n/ko.po i18n/ko.json --format=nested --pretty && node scripts/convert-po-json.js i18n/ko.json i18n/ko/main.json && rm i18n/ko.json",
        "i18n:compile-en": "npx po2json i18n/en.po i18n/en.json --format=nested --pretty && node scripts/convert-po-json.js i18n/en.json i18n/en/main.json && rm i18n/en.json",
        "i18n:compile": "pnpm i18n:compile-ko && pnpm i18n:compile-en",
        "i18n": "pnpm i18n:extract && pnpm i18n:compile"
    ```
    
    - netsjs-i18n을 이용하여 메시지 함수를 사용한다.
        - 예)
            - await this.i18n.t('Invalid credentials', { locale })
- Flutter
    - gettext, gettext_parser를 이용한다.
    - 메시지 추출은 xgettext를 이용하여 po를 추출한다.
    - po를 번역한다.
    - gettext함수를 직접 사용한다.
        - 직접 po를 읽는다.
        - 참조
        
        [gettext.dart](attachment:7d270c82-973d-4f76-8559-4d2c94464e11:gettext.dart)
        
- React
    - 주요 결정사항
        - 메시지 함수는 어떤 팩키지를 쓸것 인가?
            - react-i18next vs. react-gettext(업데이트 안됨)
    - 키포인트
        - 완변한 메지시 추출은 어떻게 하는가?
            - xgettext vs i18next-parser
            - xgettext는 JSX를 잘 이해하지 못한다.
            - i18next-parser는 추출후 기존 메시지 파일과 merge하는 기능도 있다.
            - i18next-parser는 추출시 PO로 추출할 수도 있다고 한다.
            - 번역 일관성을 위해서 여기서도 PO로 추출하면 매우 좋다.
- 번역 프로그램 소개
    - POEDIT
    -