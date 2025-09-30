# **1** Introduction **(개요)**

## 1.1 Purpose (목표)

- Describe the purpose of the particular SRS and specify the intended audience for the SRS.
- Identify the product whose software requirements are specified in this document, including the revision or release number.

## 1.2 Product Scope (범위)

Provide a short description of the software being specified. Relate the software to corporate goals or business strategies.

This should be an executive-level summary. Do not enumerate the whole requirements list here.

- Identify the software product(s) to be produced by name
- Explain what the software product(s) will, and, if necessary, will not do
- Describe the application of the software being specified, including relevant benefits, objectives, and goals
- Be consistent with similar statements in higher-level specifications if they exist
- If a separate vision and scope document is available, refer to it rather than duplicating its contents here.

## 1.3 Document Conventions (문서규칙)

본 문서를 읽는데 필요한 기본 규칙을 기술한다.

Describe any standards or typographical conventions that were followed when writing this SRS, such as fonts or highlighting that have special significance. For example, state whether priorities for higher-level requirements are assumed to be inherited by detailed requirements, or whether every requirement statement is to have its own priority.

## 1.4 Terms and Abbreviations (정의 및 약어)

본 문서에서 자주 사용되는 용어에 대한 기본 정의 및 약어를 정리한다.

## 1.5 Related Documents (관련문서)

제품기획서, Onepager, SRS, IRS 등 본 프로젝트의 SRS와 관련된 문서를 기술한다.

모든 문서는 소스코드 관리 시스템에서의 파일 위치를 명시한다.

## 1.6 Intended Audience and Reading Suggestions (대상 및 읽는 방법)

본 문서를 리뷰 할 대상(관련 부서/팀 포함)을 명시한다.

Describe the different types of reader that the document is intended for, such as developers, project managers, marketing staff, users, testers, and documentation writers.

Describe what the rest of this SRS contains and how it is organized. Suggest a sequence for reading the document, beginning with the overview sections and proceeding through the sections that are most pertinent to each reader type.

## 1.7 Project Output (프로젝트 산출물)

본 프로젝트 결과물의 형태 및 버전 등에 대해 기술한다.

산출물의 형태가 제품인지 라이브러리인지 툴인지 등을 구분하여 기술하며, 산출물명(가칭) 및 그 대표 버전을 기술한다.

### 1.7.1 Output Format (산출물 형태)

### 1.7.2 Output Name and Version (산출물명(가칭) 및 버전)

### 1.7.3 Patent Information (특허 출원 유무 및 내용)

본 프로젝트의 기술 또는 시스템 중에서 특허 출원 가능한 아이디어가 있는지를 고려하여 간략히 기술한다.

# 2 Overall Description (전체 설명)

본 프로젝트 산출물의 T0-BE 모습에 대한 전체적인 구성 및 동작, 기능 등에 대해 간략하게 기술한다.

상세한 기능 스펙은 7장에서 기술한다.

## 2.1 Product Perspective (제품 조망)

본 프로젝트 산출물과 회사의 기존 제품(또는 신규제품)과의 관계 및 연관성에 대해 기술한다.

큰 시스템중의 일부분이면 큰 시스템과의 인터페이스를 기술한다.

외부에서 본 전체적인 관점에서 보는 시스템을 인터페이스와 함께 간단한 다이어그램으로 그리는 것이 유용하다.

자세한 인터페이스는 4장의 External Interface Requirements 에서 기술한다.

시장에서의 경쟁자와의 비교를 간단히 기술한다. 연구를 위한 제품을 만든다면 관련된 연구를 언급하라.

Describe the context and origin of the product. For example, state whether this product is a follow-on member of a product family, a replacement for certain existing systems, or a new, self-contained product.

If the SRS defines a component of a larger system, relate the requirements of the larger system to the functionality of this software and identify interfaces between the two.

A simple diagram that shows the major components of the overall system, subsystem interconnections, and external interfaces can be helpful.

If you are building a real system, compare its similarity and differences to other systems in the marketplace.

If you are doing a research-oriented project, state what related research compares to the system you are planning to build.

## 2.2 Overall System Configuration (전체 시스템 구성)

본 프로젝트 산출물의 전체 시스템 구성도를 묘사한다. 내부의 관점에서 주요 Component를 도출하고 연관관계를 그린다.

## 2.3 Overall Operation (전체 동작방식)

본 프로젝트 산출물의 전체 시스템 구성도를 기준으로 동작 원리 및 시나리오 등을 기술한다.

## 2.4 Product Functions (제품 주요 기능)

본 프로젝트 산출물의 주요 기능을 간략히 기술한다. 상세한 기능은 7장에서 참조한다.

7장의 주요 제목과 일치해야 한다.

- Provide a summary of the major functions the product must perform or must let the user perform. Details will be provided in Section 7, so only a high level summary (such as a bullet list) is needed here. Sometimes the function summary that is necessary for this part can be taken directly from the section of the higher-level specification (if one exists) that allocates particular functions to the software product.
- This describes the functionality of the system in the language of the customer.
- What specifically does the system that will be designed have to do?
- Drawings are good, but remember this is a description of what the system needs to do, not how you are going to build it. (That comes in the design document).

For clarity:

- The functions should be organized in a way that makes the list of functions understandable to the customer or to anyone else reading this SRS for the first time.
- Textual or graphic methods can be used to show the different functions and their relationships. A picture of the major groups of related requirements and how they relate, such as a top level data flow diagram or object class diagram, is often effective. Such a diagram is not intended to show a design of a product but simply shows the logical relationships among variables.

## 2.5 User Classes and Characteristics (사용자 계층과 특징)

본 프로젝트 산출물을 사용할 계층과 각각의 특징에 대해 기술한다.

Identify the various user classes that you anticipate will use this product. User classes may be differentiated based on frequency of use, subset of product functions used, technical expertise, security or privilege levels, educational level, or experience.

Describe the pertinent characteristics of each user class. Certain requirements may pertain only to certain user classes. Distinguish the most important user classes for this product from those who are less important to satisfy.

## 2.6 Assumptions and Dependencies (가정과 종속 관계)

본 프로젝트를 수행하기 위해서 필요하거나, 반드시 수행 또는 결정되어야 할 전제조건 또는 선행되어야 할 프로젝트에 대해 기술하며, 그 결과에 따라 본 프로젝트의 어떤 부분에 어떻게 영향을 미칠지를 기술한다. 또한, 통제 불가능한 외부요소에 의해 영향을 받을 수 있는 경우, 그 요소에 대해 기술한다.

List any assumed factors (as opposed to known facts) that could affect the requirements stated in the SRS. These could include third-party or commercial components that you plan to use, issues around the development or operating environment, or constraints.

The project could be affected if these assumptions are incorrect, are not shared, or change. Also identify any dependencies the project has on external factors, such as software components that you intend to reuse from another project, unless they are already documented elsewhere (for example, in the vision and scope document or the project plan).

## 2.7 Apportioning of Requirements (단계별 요구사항)

Identify requirements that may be delayed until future versions of the system.  After you look at the project plan and hours available, you may realize that you just cannot get everything done.

This section divides the requirements into different sections for development and delivery.  Remember to check with the customer – they should prioritize the requirements and decide what does and does not get done.

This can also be useful if you are using an iterative life cycle model to specify which requirements will map to which iteration.

## 2.8 Backward compatibility (하위 호환성)

신규 개발이 아닌 경우, 기존 산출물과의 호환성을 보장하기 위한 방법 및 Migration 방법을 기술한다.

# **3** Environment (환경)

## 3.1 Operating Environment (운영 환경)

본 프로젝트의 산출물을 설치하고 운영하기 위한 하드웨어 환경 정보와 소프트웨어 환경 정보(OS 및 사전에 설치되어야 할 소프트웨어 등)를 기술한다.

### 3.1.1 Hardware Environment (하드웨어 환경)

### 3.1.2 Software Environment (소프트웨어 환경)

3.1.2.1 OS Environment (운영체제 환경)

본 프로젝트의 산출물이 지원하는 OS를 확인하기 위해 전사적으로 최신 OS 목록을 항상 가지고 있어야 한다.

지원하는 플랫폼에 따라 내용을 확인하고, 필요에 따라

(1) 아래 표와 같이 복사하고, 지원여부란을 만들어 체크하거나,

(2) 지원하는 플랫폼 리스트만 기술하시기 바랍니다.

**1) Windows 플랫폼**

[아래표는 샘플입니다. 반드시, 최신 OS Coverage Sheet를 받아서 사용하시기 바랍니다.]

| **Architecture** | **OS**     | **Edition** | **지원 여부** | **CPU**               |
| ---------------- | ---------- | ----------- | ------------- | --------------------- |
| x86              | Windows 95 |             |               | Intel Pentium(I ~ IV) |

Intel Pentium M Intel Pentium 4(EM64T) Intel Pentium D Intel Celeron Intel Celeron D Intel Xeon Intel Xeon(EM64T) AMD Baton AMD Athlon AMD Athlon XP AMD Athlon 64 AMD Athlon 64 X2 AMD Sempron AMD Opteron | | | Windows 95 OSR2 | | | | | | Windows NT 4 | Workstation | | | | | | Server | | | | | Windows 98 | | | | | | Windows 98 SE | | | | | | Windows Me | | | | | | Windows 2000 | Professional | | | | | | Server | | | | | | Advanced Server | | | | | Windows XP | Professional | | | | | | Home Edition | | | | | | Tablet PC Edition | | | | | | Media Center Edition | | | | | Windows Server 2003 | Standard Edition | | | | | | Enterprise Edition | | | | | | Datacenter Edition | | | | | | Web Edition | | | | x64 | Windows XP | Professional x64 Edition | | Intel Pentium D Intel Pentium 4(EM64T) Intel Celeron D Intel Xeon(EM64T) AMD Athlon 64 AMD Athlon 64 X2 AMD Opteron | | | Windows Server 2003 | Standard x64 Edition | | | | | | Enterprise x64 Edition | | | | | | Datacenter x64 Edition | | | | | | | | | | | | | | | | | | | | | | IA64 | Windows Server 2003 | Standard for Itanium | | Intel Itanium 2 | | | | Enterprise for Itanium | | | | | | Datacenter for Itanium | | |

**2) Unix/Linux 플랫폼**

최신 OS Coverage Sheet를 참조하여 작성하시기 바랍니다.

3.1.2.2 OS외 software 환경

1. Web Browser

- MS Internet Explorer 버전 (필수 지원)
- Mozilla Firefox 버전 (필수 지원)

2. 기타1

3. 기타2

## 3.2 Product Installation and Configuration (제품 설치 및 설정)

본 프로젝트의 산출물의 설치 과정에서의 요구사항을 기술한다. 또한 제품을 실행하는데 필요한 기본 설정 요소 및 방법에 대한 요구사항을 기술한다.

InstallShield와 같은 상용 설치툴 혹은 자체 개발한 설치툴이 있으면 기술한다.

6장의 Site Adaptation Requirements와 중복되는 부분은 명시하지 않는다.

## 3.3 Distribution Environment (배포 환경)

### 3.3.1 Master Configuration (마스터 구성)

본 프로젝트의 산출물 마스터를 어떤 형태로 구성할 것인지를 기술한다. 외적인 구성 형태 및 마스터 내부 구성 형태를 미리 고려한다.

예를 들어, 외적인 구성은 CD로 구성할지, 두 개의 CD로 구성할지 등을 결정한다.

예를 들어, Windows의 경우 마스터의 내부 구성은 일반적으로 다음과 같이 구성 할 수 있다(제품마다 다름).

- Disk 1 (압축파일 폴더)
- inf (CD 자동 실행)
- exe (설치)
- ini (제거 정보)
- Acrobat (Acrobat reader 프로그램 폴더)
- Manual (매뉴얼 폴더)

### 3.3.2 Distribution Method (배포 방법)

본 프로젝트의 산출물 마스터를 어떤 방법으로 배포할 것인지를 기술한다.

예를 들어, CD로 전달한다든지, 소프트웨어를 웹에서 다운로드 받게 한다든지 등의 배포 방법이 있다.

### 3.3.3 Patch/Update Method (패치와 업데이트 방법)

배포 이후, 제품 패치와 데이터나 구성 파일 업데이트 등의 업데이트 방법 및 환경을 기술한다.

## 3.4 Development Environment (개발 환경)

본 프로젝트의 산출물을 개발하기 위한 하드웨어 환경 정보와 소프트웨어 환경 정보를 기술한다.

### 3.4.1 Hardware Environment (하드웨어 환경)

### 3.4.2 Software Environment (소프트웨어 환경)

## 3.5 Test Environment (테스트 환경)

본 프로젝트의 산출물을 설치하고 테스트하기 위한 하드웨어 환경 정보와 소프트웨어 환경 정보(OS 및 사전에 설치되어야 할 소프트웨어 등)를 기술한다.

### 3.5.1 Hardware Environment (하드웨어 환경)

### 3.5.2 Software Environment (소프트웨어 환경)

## 3.6 Configuration Management (형상관리)

### 3.6.1 Location of Outputs (산출물 위치)

형상관리 서버상의 본 프로젝트의 소스 위치 및 문서 위치를 명시한다.

Location of Source Code (소스코드 위치)

Location of Documents (문서 위치)

### 3.6.2 Build Environment (빌드 환경)

빌드머신 등의 빌드 환경을 어떻게 구축/운영할지 Build/Release 팀과 협의하여 기술한다.

빌드 기계, 빌드 디렉터리, 특수하게 요구되는 빌드방법 등을 기술한다.

## 3.7 Bugtrack System (버그트래킹)

이 제품의 유지보수를 위해 사용할 버그트래킹 시스템과 버그트래킹에서 사용될 제품이름을 명시한다.

## 3.8 Other Environment (기타 환경)

# 4 External Interface Requirements (외부 인터페이스 요구사항)

이 제품과 연결되어 있는 모든 종류의 인터페이스를 기술한다.

[[If the external interfaces are complicated, the separate IRS can replace this chapter.]]

If the product is independent and totally self-contained, it should be so stated here.  If the SRS defines a product that is a component of a larger system, as frequently occurs, then this subsection relates the requirements of the larger system to functionality of the software and identifies interfaces between that system and the software.

A block diagram showing the major components of the larger system, interconnections, and external interfaces can be helpful.  This is not a design or architecture picture.  It is more to provide context, especially if your system will interact with external actors.  The system you are building should be shown as a black box.  Let the design document present the internals.

This contains a detailed description of all inputs into and outputs from the software system.

It contains both content and format as follows:

- Name of item
- Description of purpose
- Source of input or destination of output
- Valid range, accuracy and/or tolerance
- Units of measure
- Timing
- Relationships to other inputs/outputs
- Screen formats/organization
- Window formats/organization
- Data formats
- Command formats
- End messages

If the external interfaces are complicated , you may write a separate ‘Interface Requirement Specification’ document for all or any of the following interfaces.

## 4.1 System Interfaces **(**시스템 인터페이스**)**

List each system interface and identify the functionality of the software to accomplish the system requirement and the interface description to match the system. These are external systems that you have to interact with. For instance, if you are building a business application that interfaces with the existing employee payroll system, what is the API to that system that designers will need to use?

[[Means existing systems that company currently uses. Software systems(e.g. DB) to be installed with this SRS will be explained in Software Interface section]]

## 4.2 User Interface **(**사용자 인터페이스)

This is a description of how the system will interact with its users.

Describe the logical characteristics of each interface between the software product and the users. This may include sample screen images, any GUI standards or product family style guides that are to be followed, screen layout constraints, standard buttons and functions (e.g., help) that will appear on every screen, keyboard shortcuts, error message display standards, and so on.

Is there a GUI, a command line or some other type of interface?  Are there special interface requirements?  If you are designing for the general student population for instance, what is the impact of ADA (American with Disabilities Act) on your interface?

Details of the user interface design should be documented in a separate user interface specification.

## 4.3 Hardware Interface (하드웨어 인터페이스**)**

Specify the logical characteristics of each interface between the software product and the hardware components of the system.  This includes configuration characteristics. This may include the supported device types, the nature of the data and control interactions between the software and the hardware, and communication protocols to be used.

This is not a description of hardware requirements in the sense that “This program must run on a Mac with 64M of RAM”.  This section is for detailing the actual hardware devices your application will interact with and control.  For instance, if you are controlling X10 type home devices, what is the interface to those devices?

Designers should be able to look at this and know what hardware they need to worry about in the design.  Many business type applications will have no hardware interfaces.  If none, just state “The system has no hardware interface requirements”

If you just delete sections that are not applicable, then readers do not know if:

- this does not apply or
- you forgot to include the section in the first place.

## 4.4 Software Interface **(**소프트웨어 인터페이스)

Describe the connections between this product and other specific software components (name and version), including databases, operating systems, tools, libraries, and integrated commercial components. Identify the data items or messages coming into the system and going out and describe the purpose of each.

Describe the services needed and the nature of communications.

Refer to documents that describe detailed application programming interface protocols.

Identify data that will be shared across software components. If the data sharing mechanism must be implemented in a specific way (for example, use of a global data area in a multitasking operating system), specify this as an implementation constraint.

[[This is one of the examples where a senior engineer can write better SRS than a requirement specialist]]

Specify the use of other required software products and interfaces with other application systems.  For each required software product, include:

- Name
- Mnemonic (약식코드)
- Specification number
- Version number
- Source

For each interface, provide:

- Discussion of the purpose of the interfacing software as related to this software product
- Definition of the interface in terms of message content and format

Here we document the APIs, versions of software that we do not have to write, but that our system has to use.  For instance if your customer uses SQL Server 7 and you are required to use that, then you need to specify i.e.

‘Microsoft SQL Server 7’.  The system must use SQL Server as its database component.  Communication with the DB is through ODBC connections.  The system must provide SQL data table definitions to be provided to the company DBA for setup. A key point to remember is that you do NOT want to specify software here that you think would be good to use.  This is only for customer-specified systems that you have to interact with.  Choosing SQL Server 7 as a DB without a customer requirement is a Design choice, not a requirement. This is a subtle but important point to writing good requirements and not over-constraining the design.

## 4.5 Communication Interface **(**통신 인터페이스**)**

Describe the requirements associated with any communications functions required by this product, including e-mail, web browser, network server communications protocols, electronic forms, and so on.

Define any pertinent message formatting.

Identify any communication standards that will be used, such as FTP or HTTP.

Specify any communication security or encryption issues, data transfer rates, and synchronization mechanisms.

If you are using a custom protocol to communicate between systems, then document that protocol here so designers know what to design.  If it is a standard protocol, you can reference an existing document or RFC.

## **4.6** Other Interface (기타 인터페이스**)**

# **5** Performance requirements (성능 요구사항**)**

프로젝트 목표 제품의 성능 측면의 요구사항을 기술한다. 즉, 성능 목표(가능한 수치화하여)를 도출한다.

아래 항목은 프로젝트 별로 다른 성능 지표를 도출한 경우, 이를 적용하여 수정 및 추가 할 수 있다.

[[Performance requirements is one of the Non-Functional requirements. This section shows requirements that is applied to all Functional Requirements. If there are different requirements for each function, they have to be specified in Ch7 Functional Requirements section.]]

If there are performance requirements for the product under various circumstances, state them here and explain their rationale, to help the developers understand the intent and make suitable design choices.

Specify the timing relationships for real time systems.

Make such requirements as specific as possible. You may need to state performance requirements for individual functional requirements or features here or “Functional Requirements” section.

Specify both the static and the dynamic numerical requirements placed on the software or on human interaction with the software, as a whole.

Static numerical requirements may include:

(a)  The number of terminals to be supported

(b)  The number of simultaneous users to be supported

(c)  Amount and type of information to be handled

Static numerical requirements are sometimes identified under a separate section entitled capacity.

Dynamic numerical requirements may include, for example, the numbers of transactions and tasks and the amount of data to be processed within certain time periods for both normal and peak workload conditions.

All of these requirements should be stated in measurable terms.

For example,

95% of the transactions shall be processed in less than 1 second

rather than,

An operator shall not have to wait for the transaction to complete.

(Note: Numerical limits applied to one specific function are normally specified as part of the processing subparagraph description of that function.)

## 5.1 Throughput (작업처리량)

일정한 시간 내에 수행한 작업량을 의미한다.

## 5.2 Concurrent Session (동시 세션)

동시 처리수를 의미한다.

## 5.3 Response Time (대응시간)

처리 시간을 의미한다.

## 5.4 Performance Dependency (성능 종속 관계)

하나 이상의 성능이 서로 종속적일 경우 연관관계를 기술한다.

## 5.5 Other Performance Requirements (기타 성능 요구사항**)**

메모리, 디스크 공간 요구사항, DB 최대 row수와 같은 기타 성능 관련 요구사항들을 기술한다.

# 6 Non-Functional Requirements (기능 이외의 요구사항**)**

## 6.1 Safety requirements (안전성 요구사항)

Specify those requirements that are concerned with possible loss, damage, or harm that could result from the use of the product.

Define any safeguards or actions that must be taken, as well as actions that must be prevented. Refer to any external policies or regulations that state safety issues that affect the product’s design or use.

Define any safety certifications that must be satisfied.

## 6.2 Security Requirements (보안 요구사항**)**

Specify any requirements regarding security or privacy issues surrounding use of the product or protection of the data used or created by the product.

Specify the factors that would protect the software from accidental or malicious access, use, modification, destruction, or disclosure. Specific requirements in this area could include the need to:

- Utilize certain cryptographic techniques
- Keep specific log or history data sets
- Assign certain functions to different modules
- Restrict communications between some areas of the program
- Check data integrity for critical variables

Define any user identity authentication requirements. Refer to any external policies or regulations containing security issues that affect the product. Define any security or privacy certifications that must be satisfied.

## 6.3 Software System Attributes (소프트웨어 시스템 특성)

There are a number of attributes of software that can serve as requirements.  It is important that required attributes are specified so that their achievement can be objectively verified. Attributes may include availability, correctness, flexibility, interoperability, maintainability, portability, reliability, reusability, robustness, testability, and usability. The following items provide a partial list of examples.  These are also known as non-functional requirements or quality attributes.

These are characteristics the system must possess, but that pervade (or cross-cut) the design.

These requirements have to be testable just like the functional requirements.  It’s easy to start philosophizing here, but keep it specific.

### 6.3.1 Availability (가용성)

Specify the factors required to guarantee a defined availability level for the entire system such as checkpoint, recovery, and restart.  This is somewhat related to reliability.  Some systems run only infrequently on-demand (like MS Word).  Some systems have to run 24/7 (like an e-commerce web site).  The required availability will greatly impact the design.  What are the requirements for system recovery from a failure?  “The system shall allow users to restart the application after failure with the loss of at most 12 characters of input”.

### 6.3.2 Maintainability (유지보수성)

Specify attributes of software that relate to the ease of maintenance of the software itself.  There may be some requirement for certain modularity, interfaces, complexity, etc.

### 6.3.3 Portability (이식성)

Specify attributes of software that relate to the ease of porting the software to other host machines and/or operating systems.  This may include:

- Percentage of components with host-dependent code
- Percentage of code that is host dependent
- Use of a proven portable language
- Use of a particular compiler or language subset
- Use of a particular operating system
- Use of a particular CPU (Big Endian vs. Little Endian issue)

### 6.3.4 Reliability (신뢰성)

Specify the factors required to establish the required reliability of the software system at time of delivery.  If you have MTBF requirements, express them here.  This doesn’t refer to just having a program that does not crash. This has a specific engineering meaning.

### 6.3.5 Remaining Attributes (나머지 특성)

Definitions of the quality characteristics not defined in the paragraphs above follow.

Once the relevant characteristics are selected, a subsection should be written for each, explaining the rationale for including this characteristic and how it will be tested and measured.

- Correctness - extent to which program satisfies specifications, fulfills user’s mission objectives
- Efficiency - amount of computing resources and code required to perform function
- Flexibility - effort needed to modify operational program
- Interoperability - effort needed to couple one system with another (e.g. EAI, Web Services)
- Reusability - extent to which it can be reused in another application
- Testability - effort needed to test to ensure performs as intended
- Usability - effort required to learn, operate, prepare input, and interpret output

## 6.4 Logical Database Requirements (데이터베이스 요구사항)

This section specifies the logical requirements for any information that is to be placed into a database.  This may include:

- Types of information used by various functions
- Frequency of use
- Accessing capabilities
- Data entities and their relationships
- Integrity constraints (무결성)
- Data retention requirements (보존 요구)

If the customer provided you with data models, those can be presented here.  ER diagrams (or static class diagrams) can be useful here to show complex data relationships.  Remember a diagram is worth a thousand words of confusing text.

## 6.5 Business Rules (비즈니스 규칙)

List any operating principles about the product, such as which individuals or roles can perform which functions under specific circumstances.

These are not functional requirements in themselves, but they may imply certain functional requirements to enforce the rules.

[[Business applications like ERP and EIS have a lot of different roles to use the system.]]

## 6.6 Design and Implementation Constraints (설계와 구현 제한사항)

Specify design constraints that can be imposed by other standards, hardware limitations, etc.

### 6.6.1 Standards Compliance (표준준수)

Specify the requirements derived from existing standards or regulations. They might include:

(1)  Report format

(2)  Data naming

(3)  Accounting procedures

(4)  Audit Tracing

For example, this could specify the requirement for software to trace processing activity.  Such traces are needed for some applications to meet minimum regulatory or financial standards.  An audit trace requirement may, for example, state that all changes to a payroll database must be recorded in a trace file with before and after values.

### 6.6.2 Other Constraints (기타 제한 사항)

Describe any items or issues that will limit the options available to the developers.

These might include:

- corporate or regulatory policies;
- hardware limitations (e.g. signal timing requirements, memory requirements);
- interfaces to other applications;
- specific technologies, tools, and databases to be used;
- parallel operations;
- higher-order language requirements;
- communications protocols;
- design conventions
- programming standards (for example, if the customer’s organization will be responsible for maintaining the delivered software)

설계와 구현상의 제약 조건이 있을 경우 기술한다. 예를 들어,

- 사용해야 하거나 피해야 할 기술, 설계툴, 개발 툴, 개발 언어, DB 등이 있으면 기술한다.
- 준수해야 할 개발 규칙(프로그래밍가이드, 에러코드, 빌드버전 등)이나, 표준(표준명 및 버전) 등이 있으면 기술한다.
- 하드웨어나 운영환경상의 제약조건은 3장에서 명시한다.

## 6.7 Memory Constraints (메모리 제한 사항)

Specify any applicable characteristics and limits on primary and secondary memory. Don’t just make up something here.  If all the customer’s machines have only 128K of RAM, then your target design has got to come in under 128K so there is an actual requirement.

You could also cite market research here for shrink-wrap type applications “Focus groups have determined that our target market has between 256-512M of RAM, therefore the design footprint should not exceed 256M.”  If there are no memory constraints, so state.

## 6.8 Operations (운영 요구사항**)**

Specify the normal and special operations required by the user such as:

- The various modes of operations in the user organization
- Periods of interactive operations and periods of operations unattended
- Data processing support functions
- Backup and recovery operations

(Note:  This is sometimes specified as part of the User Interfaces section.)

If you separate this from the UI stuff earlier, then cover business process type stuff that would impact the design.  For instance, if the company brings all their systems down at midnight for data backup that might impact the design. These are all the work tasks that impact the design of an application, but which might not be located in software.

## 6.9 Site Adaptation Requirements **(**사이트 적용 요구사항**)**

In this section:

- Define the requirements for any data or initialization sequences that are specific to a given site, mission, or operational mode
- Specify the site or mission-related features that should be modified to adapt the software to a particular installation

If any modifications to the customer’s work area would be required by your system, then document that here.  For instance, “A 100Kw backup generator and 10000 BTU air conditioning systems must be installed at the user site prior to software installation”.

This could also be software-specific like, “New data tables created for this system must be installed on the company’s existing DB server and populated prior to system activation.”

Any equipment the customer would need to buy or any software setup that needs to be done so that your system will install and operate correctly should be documented here.

## 6.10 Internationalization Requirements (다국어 지원 요구사항)

다국어 지원 계획에 대해 기술한다.

지원 가능한 언어종류는 다음과 같이 구분한다.

- 한국어
- 영어
- 일어
- Chinese-PRC(간체, \*기존에 지원하는 중국어임)
- Chinese-Taiwan(번체)
- Chinese-Hongkong(번체)
- Chinese-Singapore(간체)
- 그 외 지원하는 언어

## 6.11 Unicode Support (유니코드 지원)

Unicode를 지원할 수 있는지, 향후 지원 계획 등에 대해 기술한다.

## 6.12 64bit Support (64비트 지원)

64bit를 지원할 수 있는지, 향후 지원 계획 등에 대해 기술한다.

## 6.13 Certification **(**제품 인증)

본 프로젝트 산출물이 외부 인증을 받아야 하는지, 받는다면 어떤 인증을 받아야 하는지, 언제 어떤 방법으로 진행하며, 무엇을 준비해야 하는지, 그 비용은 어떻게 되는지 등을 기술한다. 마케팅과 협의 요망함.

예를 들어, 다음과  같은 리스트가 있다.

- MS Logo 인증
- Good Software 인증
- 국제공통평가기준(CC)

## 6.14 Field Test (필드 테스트)

본 프로젝트 산출물이 field test가 필요한지 여부 및 field test 계획 등을 마케팅과 협의하여 간략히 기술한다.

상세 일정 및 레퍼런스 사이트 리스트 등은 개발계획서에 명시한다.

## 6.15 Other Requirements (기타 요구 사항)

Define any other requirements not covered elsewhere in the SRS. This might include database requirements, legal requirements, reuse objectives for the project, and so on. Add any new sections that are pertinent to the project.

# 7 Functional Requirements (기능요구사항)

2장에서 설명되었던 제품 주요 기능을 상세하게 분류하고, 설명한다.

각 기능을 구분 가능하도록 개별번호를 붙인다.

WBS의 각 기능항목은 작업량이 1~2일 정도로 산정 가능하도록 세분하여 작성한다.

Instruction to organizing the functional requirements

For anything but trivial systems the detailed requirements tend to be extensive. For this reason, it is recommended that careful consideration be given to organizing these in a manner optimal for understanding.

There is no one optimal organization for all systems.

1. **System mode**

Some systems behave quite differently depending on the mode of operation. For example, a control system may have different sets of functions depending on its mode: training, normal, or emergency. The choice depends on whether interfaces and performance are dependent on mode.

1. **User class**

Some systems provide different sets of functions to different classes of users. For example, an elevator control system presents different capabilities to passengers, maintenance workers, and fire fighters.

1. **Objects**

Objects are real-world entities that have a counterpart within the system. For example, in a patient monitoring system, objects include patients, sensors, nurses, rooms, physicians, medicines, etc. Associated with each object is a set of attributes (of that object) and functions (performed by that object). These functions are also called services, methods, or processes. When organizing this section by object, Note that sets of objects may share attributes and services. These are grouped together as classes.

1. **Feature**

A feature is an externally desired service by the system that may require a sequence of inputs to effect the desired result. For example, in a telephone system, features include local call, call forwarding, and conference call. Each feature is generally described in a sequence of stimulus-response pairs.

1. **Stimulus**

Some systems can be best organized by describing their functions in terms of stimuli. For example, the functions of an automatic aircraft landing system may be organized into sections for loss of power, wind shear, sudden change in roll, vertical velocity excessive, etc.

1. **Response**

Some systems can be best organized by describing all the functions in support of the generation of a response. For example, the functions of a personnel system may be organized into sections corresponding to all functions associated with generating paychecks, all functions associated with generating a current list of employees, etc.

1. **Functional hierarchy**

When none of the above organizational schemes prove helpful, the overall functionality can be organized into a hierarchy of functions organized by either common inputs, common outputs, or common internal data access. Data Flow diagrams and data dictionaries can be used to show the relationships between and among the functions and data.

## 7.1 대분류 기능1

### 7.1.1 ……

### 7.1.1.1. ……

### 7.1.1.1.1. ……

### 7.1.1.1.1.1. ……

### 7.1.2 ……

## 7.2 대분류 기능2

## 7.3 대분류 기능3

……
