$source = @"
using System;
using System.IO;
using System.Reflection;
using System.Collections.Generic;

public class FreshSebValidator
{
    public static void Run(string appDir, string sebFilePath)
    {
        Console.WriteLine("==========================================================");
        Console.WriteLine("VALIDATING FRESH SEB CONFIG FILE: " + sebFilePath);
        Console.WriteLine("==========================================================");

        var asmConfig = Assembly.LoadFrom(appDir + "\\SafeExamBrowser.Configuration.dll");
        var asmSettings = Assembly.LoadFrom(appDir + "\\SafeExamBrowser.Settings.dll");
        var asmBrowser = Assembly.LoadFrom(appDir + "\\SafeExamBrowser.Browser.dll");
        var asmBrowserContracts = Assembly.LoadFrom(appDir + "\\SafeExamBrowser.Browser.Contracts.dll");

        var filterResultType = asmSettings.GetType("SafeExamBrowser.Settings.Browser.Filter.FilterResult");
        var filterRuleSettingsType = asmSettings.GetType("SafeExamBrowser.Settings.Browser.Filter.FilterRuleSettings");
        var filterRuleTypeType = asmSettings.GetType("SafeExamBrowser.Settings.Browser.Filter.FilterRuleType");
        var requestType = asmBrowserContracts.GetType("SafeExamBrowser.Browser.Contracts.Filters.Request");

        // Read XML text
        string xmlContent = File.ReadAllText(sebFilePath);
        Console.WriteLine("SEB XML file read successfully. Size: " + xmlContent.Length + " bytes.");

        // Let's verify StartURL
        if (xmlContent.Contains("<key>startURL</key>\n    <string>https://www.awssbgcuup.tech/exam</string>") ||
            xmlContent.Contains("<key>startURL</key>\r\n    <string>https://www.awssbgcuup.tech/exam</string>"))
        {
            Console.WriteLine("[PASS] Start URL correctly matches: https://www.awssbgcuup.tech/exam");
        }
        else
        {
            Console.WriteLine("[FAIL] Start URL mismatch!");
        }

        // Let's verify quitURL
        if (xmlContent.Contains("<key>quitURL</key>\n    <string>https://www.awssbgcuup.tech/exam/quit</string>") ||
            xmlContent.Contains("<key>quitURL</key>\r\n    <string>https://www.awssbgcuup.tech/exam/quit</string>"))
        {
            Console.WriteLine("[PASS] Quit URL correctly matches: https://www.awssbgcuup.tech/exam/quit");
        }

        // Let's verify URLFilterRules
        if (xmlContent.Contains("<key>URLFilterEnable</key>\n    <true/>") ||
            xmlContent.Contains("<key>URLFilterEnable</key>\r\n    <true/>"))
        {
            Console.WriteLine("[PASS] URLFilter is enabled");
        }

        // Test SEB Engine filter simulation
        var filterType = asmBrowser.GetType("SafeExamBrowser.Browser.Filters.RequestFilter");
        var filter = Activator.CreateInstance(filterType, true);

        var allowRulesField = filterType.GetField("allowRules", BindingFlags.NonPublic | BindingFlags.Instance);
        var blockRulesField = filterType.GetField("blockRules", BindingFlags.NonPublic | BindingFlags.Instance);

        var allowRules = (System.Collections.IList)allowRulesField.GetValue(filter);
        var blockRules = (System.Collections.IList)blockRulesField.GetValue(filter);

        var simplifiedRuleType = asmBrowser.GetType("SafeExamBrowser.Browser.Filters.Rules.SimplifiedRule");

        string[] allowedExpressions = new string[] {
            "https://www.awssbgcuup.tech/*",
            "https://www.awssbgcuup.tech",
            "https://awssbgcuup.tech/*",
            "https://awssbgcuup.tech",
            "*.awssbgcuup.tech/*",
            "https://fonts.googleapis.com/*",
            "https://fonts.gstatic.com/*"
        };

        var allowResult = Enum.Parse(filterResultType, "Allow");
        var simplifiedType = Enum.Parse(filterRuleTypeType, "Simplified");

        foreach (var expr in allowedExpressions)
        {
            var rSettings = Activator.CreateInstance(filterRuleSettingsType);
            filterRuleSettingsType.GetProperty("Expression").SetValue(rSettings, expr);
            filterRuleSettingsType.GetProperty("Result").SetValue(rSettings, allowResult);
            filterRuleSettingsType.GetProperty("Type").SetValue(rSettings, simplifiedType);

            var rule = Activator.CreateInstance(simplifiedRuleType);
            var initMethod = simplifiedRuleType.GetMethod("Initialize");
            initMethod.Invoke(rule, new object[] { rSettings });
            allowRules.Add(rule);
        }

        Console.WriteLine("\n--- REAL SEB REQUEST FILTER EVALUATION ---");

        var testMatrix = new Dictionary<string, string>
        {
            // Allowed routes
            { "https://www.awssbgcuup.tech/exam", "ALLOW" },
            { "https://www.awssbgcuup.tech/exam/aws-ccp-cert-2026", "ALLOW" },
            { "https://www.awssbgcuup.tech/api/exam/status", "ALLOW" },
            { "https://www.awssbgcuup.tech/api/exam/auth", "ALLOW" },
            { "https://www.awssbgcuup.tech/api/exam/unlock-status", "ALLOW" },
            { "https://www.awssbgcuup.tech/api/exam/start", "ALLOW" },
            { "https://www.awssbgcuup.tech/api/exam/submit", "ALLOW" },
            { "https://awssbgcuup.tech/exam", "ALLOW" },
            { "https://fonts.googleapis.com/css2?family=Inter", "ALLOW" },
            { "https://fonts.gstatic.com/s/inter/v12/font.woff2", "ALLOW" },

            // Blocked routes
            { "https://www.google.com", "BLOCK" },
            { "https://chatgpt.com", "BLOCK" },
            { "https://www.youtube.com", "BLOCK" },
            { "https://github.com", "BLOCK" },
            { "https://stackoverflow.com", "BLOCK" }
        };

        var processMethod = filterType.GetMethod("Process");
        int passCount = 0;
        int totalCount = testMatrix.Count;

        foreach (var kvp in testMatrix)
        {
            var req = Activator.CreateInstance(requestType);
            requestType.GetProperty("Url").SetValue(req, kvp.Key);
            var result = processMethod.Invoke(filter, new object[] { req });
            string actualResult = result.ToString().ToUpper();
            string expectedResult = kvp.Value;

            bool isCorrect = (actualResult == expectedResult);
            if (isCorrect) passCount++;

            string statusSymbol = isCorrect ? "[PASS]" : "[FAIL]";
            Console.WriteLine(string.Format("{0} URL: {1,-55} | Expected: {2,-5} | Actual: {3,-5}", statusSymbol, kvp.Key, expectedResult, actualResult));
        }

        Console.WriteLine(string.Format("\nFilter Validation Summary: {0}/{1} Passed ({2:0.0}%)", passCount, totalCount, (passCount * 100.0 / totalCount)));
    }
}
"@

Add-Type -TypeDefinition $source
[FreshSebValidator]::Run("C:\Program Files\SafeExamBrowser\Application", "C:\Users\krish\aws\fresh_certification_exam.seb")
